import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.api.v1 import api_router
from backend.app.db.init_db import init_tables, seed_initial_data
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service


from backend.app.workers.zabbix_poller import poll_once
from backend.app.api.websocket import router as ws_router, manager as ws_manager


async def background_zabbix_poller():
    """Background worker that continuously collects and refreshes Digital Twin telemetry"""
    while True:
        try:
            await poll_once()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Background Telemetry Poller Error] {e}")
        await asyncio.sleep(settings.ZABBIX_SYNC_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables, optional demo seed, run initial sync, start background poller
    try:
        await init_tables()
        if settings.AUTO_SEED_DEMO_DATA:
            await seed_initial_data()
        await poll_once()
    except Exception as e:
        print(f"[Lifespan Startup Error] {e}")

    poller_task = asyncio.create_task(background_zabbix_poller())

    yield

    # Shutdown: Cancel background task and close redis client
    poller_task.cancel()
    try:
        await poller_task
    except asyncio.CancelledError:
        pass
    await ws_manager.stop()
    await redis_service.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.requests import Request
from starlette.responses import JSONResponse


@app.middleware("http")
async def api_key_perimeter_middleware(request: Request, call_next):
    """
    Perimeter Security Middleware:
    - Disabled by default for internal NOC intranet (zero JWT/session overhead).
    - When enabled via API_KEY_ENABLED=True, verifies X-API-Key header.
    - Always allows /health, /api/v1/health, and Swagger/OpenAPI docs for container liveness probes.
    """
    if not settings.API_KEY_ENABLED:
        return await call_next(request)

    path = request.url.path
    whitelisted_paths = {
        "/health",
        f"{settings.API_V1_PREFIX}/health",
        "/docs",
        "/redoc",
        f"{settings.API_V1_PREFIX}/openapi.json",
        "/openapi.json",
    }
    if path in whitelisted_paths or request.method == "OPTIONS":
        return await call_next(request)

    client_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    if not client_key or client_key != settings.API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: Invalid or missing X-API-Key header"},
        )

    return await call_next(request)


from sqlalchemy import text
from backend.app.db.session import engine

# Include WebSocket Routers (at root /ws/live-twin and /api/v1/ws/live-twin)
app.include_router(ws_router)
app.include_router(ws_router, prefix=settings.API_V1_PREFIX)

# Include API v1 Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
@app.get(f"{settings.API_V1_PREFIX}/health")
async def health_check():
    db_status = "connected"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    redis_ok = await redis_service.ping()
    redis_status = "connected" if redis_ok else "disconnected"

    is_healthy = (db_status == "connected") and redis_ok

    return {
        "status": "healthy" if is_healthy else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status,
        "redis": redis_status,
        "zabbix_mode": settings.ZABBIX_MODE,
        "zabbix_effective_url": settings.zabbix_effective_url,
        "zabbix_web_console_url": settings.zabbix_web_console_url,
        "environment": settings.APP_ENV,
    }


@app.get(f"{settings.API_V1_PREFIX}/status")
async def api_status():
    return {
        "status": "ok",
        "service": "nexustwin_backend",
    }
