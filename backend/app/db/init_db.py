import asyncio
from sqlalchemy import select
from backend.app.db.session import engine, AsyncSessionLocal, Base
from backend.app.db.models import Site, Room, Rack, Device
from backend.app.services.zabbix_service import zabbix_service


async def init_tables():
    """Create all tables in PostgreSQL"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DB Init] All database tables created successfully.")


async def seed_initial_data():
    """Seed Room A, 12 Racks, and sample devices mapped to real Zabbix hosts"""
    async with AsyncSessionLocal() as session:
        # Check if Site already exists
        result = await session.execute(select(Site).where(Site.code == "BKK-DC1"))
        site = result.scalar_one_or_none()

        if not site:
            site = Site(
                name="Bangkok DC",
                code="BKK-DC1",
                description="Main Production Data Center (Bangkok)",
            )
            session.add(site)
            await session.flush()
            print(f"[DB Seed] Created Site: {site.name}")

        # Check Room A
        result = await session.execute(select(Room).where(Room.site_id == site.id, Room.name == "Room A"))
        room = result.scalar_one_or_none()

        if not room:
            room = Room(
                site_id=site.id,
                name="Room A",
                room_temp_target=24.5,
                grid_rows=3,
                grid_cols=4,
            )
            session.add(room)
            await session.flush()
            print(f"[DB Seed] Created Room: {room.name}")

        # Fetch available real hosts from Zabbix to link dynamically
        zabbix_host_map = {}
        try:
            hosts = await zabbix_service.get_all_hosts()
            for h in hosts:
                zabbix_host_map[h.get("name", "")] = h.get("hostid")
                zabbix_host_map[h.get("host", "")] = h.get("hostid")
            print(f"[DB Seed] Loaded {len(hosts)} Zabbix hosts for mapping.")
        except Exception as e:
            print(f"[DB Seed] Warning: Could not fetch Zabbix hosts during seed: {e}")

        # Create 12 Racks: Row A (A01-A04), Row B (B01-B04), Row C (C01-C04)
        racks_dict = {}
        for row in ["A", "B", "C"]:
            for col in range(1, 5):
                rack_name = f"Rack {row}{col:02d}"
                result = await session.execute(
                    select(Rack).where(Rack.room_id == room.id, Rack.name == rack_name)
                )
                rack = result.scalar_one_or_none()
                if not rack:
                    rack = Rack(
                        room_id=room.id,
                        name=rack_name,
                        row=f"Row {row}",
                        col=col,
                        total_u=42,
                        max_power_kw=8.0,
                    )
                    session.add(rack)
                    await session.flush()
                racks_dict[f"{row}{col:02d}"] = rack

        print(f"[DB Seed] Ensured 12 Racks in Room A.")

        # Seed devices in Rack B03 matching the Demo
        rack_b03 = racks_dict.get("B03")
        if rack_b03:
            result = await session.execute(select(Device).where(Device.rack_id == rack_b03.id))
            existing_devices = result.scalars().all()
            if not existing_devices:
                # Helper to find zabbix host id
                def find_zabbix_id(*names):
                    for n in names:
                        if n in zabbix_host_map:
                            return zabbix_host_map[n]
                    return None

                devices_to_create = [
                    # Top Patch Panels (U41 - U42)
                    Device(
                        rack_id=rack_b03.id,
                        name="PP-01",
                        device_type="Patch Panel",
                        model="Cat6A 24-Port Patch Panel",
                        manufacturer="CommScope",
                        start_u=42,
                        height_u=1,
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="PP-02",
                        device_type="Patch Panel",
                        model="Cat6A 24-Port Patch Panel",
                        manufacturer="CommScope",
                        start_u=41,
                        height_u=1,
                    ),
                    # Core Switches (U38 - U39)
                    Device(
                        rack_id=rack_b03.id,
                        name="SW-CORE-01",
                        device_type="Switch",
                        model="CloudEngine 6857",
                        manufacturer="Huawei",
                        start_u=39,
                        height_u=1,
                        ip_address="10.10.10.1",
                        zabbix_host_id=find_zabbix_id("SW-DC-Core01_test", "SW-DC-Core01_test_01"),
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="SW-CORE-02",
                        device_type="Switch",
                        model="CloudEngine 6857",
                        manufacturer="Huawei",
                        start_u=38,
                        height_u=1,
                        ip_address="10.10.10.2",
                        zabbix_host_id=find_zabbix_id("SW-DC-Core01_test_02"),
                    ),
                    # Firewalls (U34 - U35)
                    Device(
                        rack_id=rack_b03.id,
                        name="FW-01",
                        device_type="Firewall",
                        model="FortiGate 100F",
                        manufacturer="Fortinet",
                        start_u=35,
                        height_u=1,
                        ip_address="10.10.10.254",
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="FW-02",
                        device_type="Firewall",
                        model="FortiGate 100F",
                        manufacturer="Fortinet",
                        start_u=34,
                        height_u=1,
                        ip_address="10.10.10.253",
                    ),
                    # Web Servers (U29 - U32)
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-WEB-01",
                        device_type="Server",
                        model="PowerEdge R650",
                        manufacturer="Dell EMC",
                        start_u=31,
                        height_u=1,
                        ip_address="10.10.20.11",
                        zabbix_host_id=find_zabbix_id("web-01", "Web Server 01"),
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-WEB-02",
                        device_type="Server",
                        model="PowerEdge R650",
                        manufacturer="Dell EMC",
                        start_u=29,
                        height_u=1,
                        ip_address="10.10.20.12",
                        zabbix_host_id=find_zabbix_id("web-02", "Web Server 02"),
                    ),
                    # App Servers (U25 - U28)
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-APP-03",
                        device_type="Server",
                        model="PowerEdge R750",
                        manufacturer="Dell EMC",
                        start_u=27,
                        height_u=2,  # 2U (Occupies 27-28)
                        ip_address="10.10.20.33",
                        zabbix_host_id=find_zabbix_id("SUATPOCSREAPP01", "lab-server-01", "Lab Server 01 (Prod)"),
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-APP-04",
                        device_type="Server",
                        model="PowerEdge R750",
                        manufacturer="Dell EMC",
                        start_u=25,
                        height_u=2,  # 2U (Occupies 25-26)
                        ip_address="10.10.20.34",
                        zabbix_host_id=find_zabbix_id("SUATPOCSREAPP02"),
                    ),
                    # Database Servers (U19 - U22)
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-DB-01",
                        device_type="Server",
                        model="PowerEdge R750xd",
                        manufacturer="Dell EMC",
                        start_u=21,
                        height_u=2,
                        ip_address="10.10.20.51",
                        zabbix_host_id=find_zabbix_id("db-01", "Database Server 01"),
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="SRV-DB-02",
                        device_type="Server",
                        model="PowerEdge R750xd",
                        manufacturer="Dell EMC",
                        start_u=19,
                        height_u=2,
                        ip_address="10.10.20.52",
                        zabbix_host_id=find_zabbix_id("db-02", "Database Server 02"),
                    ),
                    # Storage Arrays (U8 - U13)
                    Device(
                        rack_id=rack_b03.id,
                        name="STG-01",
                        device_type="Storage",
                        model="PowerStore 500T",
                        manufacturer="Dell EMC",
                        start_u=11,
                        height_u=2,
                        ip_address="10.10.30.1",
                    ),
                    Device(
                        rack_id=rack_b03.id,
                        name="STG-02",
                        device_type="Storage",
                        model="PowerStore 500T",
                        manufacturer="Dell EMC",
                        start_u=8,
                        height_u=2,
                        ip_address="10.10.30.2",
                    ),
                    # Bottom UPS (U1 - U4)
                    Device(
                        rack_id=rack_b03.id,
                        name="UPS-01",
                        device_type="UPS",
                        model="Smart-UPS RT 5000VA",
                        manufacturer="APC",
                        start_u=1,
                        height_u=4,  # 4U (Occupies 1-4)
                    ),
                ]
                session.add_all(devices_to_create)
                await session.flush()
                print(f"[DB Seed] Seeded {len(devices_to_create)} devices in Rack B03.")

        await session.commit()
        print("[DB Seed] Database initialization and seed completed.")


if __name__ == "__main__":
    async def main():
        await init_tables()
        await seed_initial_data()
    asyncio.run(main())
