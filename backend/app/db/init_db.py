import asyncio
from sqlalchemy import select, text, func
from backend.app.db.session import engine, AsyncSessionLocal, Base
from backend.app.db.models import (
    Site,
    Building,
    Room,
    Row,
    Rack,
    DeviceModel,
    Device,
    DeviceConnection,
    KnowledgeDocument,
    Subnet,
)
from backend.app.db.seed_demo_datacenter import seed_datacenter


async def init_tables():
    """Create all 9 core NexusTwin tables + Subnet in dcim_db"""
    async with engine.begin() as conn:
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "vector";'))
        await conn.run_sync(Base.metadata.create_all)
    print("[DB Init] All NexusTwin database tables created successfully in dcim_db.")


async def seed_initial_data(reset_devices: bool = False):
    """Ensure Bangkok DC-1 demo datacenter is populated in dcim_db"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(func.count(Site.id)))
        count = result.scalar() or 0
        if count == 0 or reset_devices:
            print("[DB Seed] No sites found. Running seed_datacenter...")
            await seed_datacenter(force_clean=reset_devices)
        else:
            print(f"[DB Seed] Found {count} existing site(s). Bangkok DC-1 is already initialized.")


if __name__ == "__main__":
    import sys
    reset = "--reset" in sys.argv
    seed = "--seed" in sys.argv or reset

    async def main():
        await init_tables()
        if seed:
            await seed_initial_data(reset_devices=reset)
        else:
            print("[DB Init] Schema initialized. To populate demo data, run with --seed (or --reset to wipe and reseed).")

    asyncio.run(main())
