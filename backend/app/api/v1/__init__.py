from fastapi import APIRouter
from backend.app.api.v1.overview import router as overview_router
from backend.app.api.v1.racks import router as racks_router
from backend.app.api.v1.devices import router as devices_router
from backend.app.api.v1.zabbix import router as zabbix_router
from backend.app.api.v1.rooms import router as rooms_router
from backend.app.api.v1.ipam import router as ipam_router
from backend.app.api.v1.webhooks import router as webhooks_router
from backend.app.api.v1.ai import router as ai_router

api_router = APIRouter()
api_router.include_router(overview_router, prefix="/overview", tags=["Overview"])
api_router.include_router(racks_router, prefix="/racks", tags=["Racks"])
api_router.include_router(devices_router, prefix="/devices", tags=["Devices"])
api_router.include_router(zabbix_router, prefix="/zabbix", tags=["Zabbix"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(ipam_router, prefix="/ipam", tags=["IPAM"])
api_router.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(ai_router, prefix="/ai", tags=["AI Copilot"])



