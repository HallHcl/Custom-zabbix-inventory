import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.api.v1 import api_router
from backend.app.db.init_db import init_tables, seed_initial_data
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service


async def background_zabbix_poller():
    """Background worker that continuously syncs Zabbix to Redis"""
    while True:
        try:
            await sync_service.sync_zabbix_cache()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Background Sync Error] {e}")
        await asyncio.sleep(settings.ZABBIX_SYNC_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables, seed, run initial sync, start background poller
    try:
        await init_tables()
        await seed_initial_data()
        await sync_service.sync_zabbix_cache()
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

# Include API v1 Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@app.get(f"{settings.API_V1_PREFIX}/status")
async def api_status():
    return {
        "status": "ok",
        "service": "dc_vision_backend",
    }
