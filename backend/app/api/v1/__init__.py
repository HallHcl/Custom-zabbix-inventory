from fastapi import APIRouter
from backend.app.api.v1.overview import router as overview_router
from backend.app.api.v1.racks import router as racks_router
from backend.app.api.v1.devices import router as devices_router
from backend.app.api.v1.zabbix import router as zabbix_router
from backend.app.api.v1.rooms import router as rooms_router

api_router = APIRouter()
api_router.include_router(overview_router, prefix="/overview", tags=["Overview"])
api_router.include_router(racks_router, prefix="/racks", tags=["Racks"])
api_router.include_router(devices_router, prefix="/devices", tags=["Devices"])
api_router.include_router(zabbix_router, prefix="/zabbix", tags=["Zabbix"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["Rooms"])

