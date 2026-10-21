import asyncio
from sqlalchemy import select, delete, text
from backend.app.db.session import engine, AsyncSessionLocal, Base
from backend.app.db.models import Site, Room, Rack, Device, Subnet
from backend.app.services.zabbix_service import zabbix_service


async def init_tables():
    """Create all tables in PostgreSQL and apply schema migrations"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text("ALTER TABLE devices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'")
        )
        await conn.execute(
            text("UPDATE devices SET status = 'Active' WHERE status IS NULL")
        )
    print("[DB Init] All database tables created and schema migrated successfully.")



async def seed_initial_data(reset_devices: bool = False):
    """Seed Room A, 12 Racks, and 16 DC devices with Dynamic Custom Fields mapped to Zabbix"""
    async with AsyncSessionLocal() as session:
        # Check Site
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
                hid = h.get("hostid")
                zabbix_host_map[h.get("name", "")] = hid
                zabbix_host_map[h.get("host", "")] = hid
            print(f"[DB Seed] Loaded {len(hosts)} Zabbix hosts for mapping.")
        except Exception as e:
            print(f"[DB Seed] Warning: Could not fetch Zabbix hosts during seed: {e}")

        def find_zabbix_id(*names):
            for n in names:
                if n in zabbix_host_map:
                    return zabbix_host_map[n]
                for zh_name, zh_id in zabbix_host_map.items():
                    if n.lower() in zh_name.lower():
                        return zh_id
            return None

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

        if reset_devices:
            await session.execute(delete(Device))
            await session.flush()
            print("[DB Seed] Cleared existing devices for fresh re-seed.")

        # Check existing devices
        result = await session.execute(select(Device))
        existing_devices = result.scalars().all()

        if not existing_devices or reset_devices:
            devices_to_create = [
                # --- Rack A01 (Core Network & Security Primary) ---
                Device(
                    rack_id=racks_dict["A01"].id,
                    name="DC1-CORE-SW-01",
                    device_type="Switch",
                    model="CloudEngine 6885-48Y8C",
                    manufacturer="Huawei Technologies",
                    start_u=38,
                    height_u=2,
                    ip_address="10.220.10.1",
                    serial_number="2102353YDF10NB000101",
                    zabbix_host_id=find_zabbix_id("DC1-CORE-SW-01"),
                    custom_fields={
                        "brand": "Huawei",
                        "vendor": "Huawei Technologies",
                        "version": "V200R021C00",
                        "user": "NOC-Team",
                        "role": "Core Switch",
                        "warranty_exp": "2028-12-31",
                        "uplink_speed": "100 Gbps",
                    },
                    tags={"Environment": "Production", "Criticality": "Tier-1", "Zone": "Backbone"},
                ),
                Device(
                    rack_id=racks_dict["A01"].id,
                    name="DC1-EDGE-FW-01",
                    device_type="Firewall",
                    model="FortiGate 701G",
                    manufacturer="Fortinet Inc.",
                    start_u=34,
                    height_u=2,
                    ip_address="10.220.20.1",
                    serial_number="FG701GTK24000188",
                    zabbix_host_id=find_zabbix_id("DC1-EDGE-FW-01"),
                    custom_fields={
                        "brand": "Fortinet",
                        "vendor": "Fortinet Inc.",
                        "version": "FortiOS 7.4.2",
                        "user": "SecOps-Team",
                        "role": "NextGen Firewall",
                        "warranty_exp": "2027-06-30",
                        "cluster_mode": "Active-Passive",
                    },
                    tags={"Environment": "Production", "Security_Level": "High", "Zone": "Perimeter"},
                ),
                Device(
                    rack_id=racks_dict["A01"].id,
                    name="DC1-UPS-RACK-A",
                    device_type="UPS",
                    model="Smart-UPS RT 10kVA Online",
                    manufacturer="Schneider Electric (APC)",
                    start_u=1,
                    height_u=4,
                    ip_address="10.220.40.1",
                    serial_number="APC99482710398",
                    zabbix_host_id=find_zabbix_id("DC1-UPS-RACK-A"),
                    custom_fields={
                        "brand": "APC",
                        "vendor": "Schneider Electric",
                        "version": "NMC3 v4.2.1",
                        "user": "Facility-Team",
                        "role": "Online UPS 10kVA",
                        "battery_health": "100%",
                        "runtime_min": "45 min",
                    },
                    tags={"Facility": "Power", "Phase": "3-Phase", "Redundancy": "2N"},
                ),

                # --- Rack A02 (Core Network & Security Secondary) ---
                Device(
                    rack_id=racks_dict["A02"].id,
                    name="DC1-CORE-SW-02",
                    device_type="Switch",
                    model="CloudEngine 6885-48Y8C",
                    manufacturer="Huawei Technologies",
                    start_u=38,
                    height_u=2,
                    ip_address="10.220.10.2",
                    serial_number="2102353YDF10NB000102",
                    zabbix_host_id=find_zabbix_id("DC1-CORE-SW-02"),
                    custom_fields={
                        "brand": "Huawei",
                        "vendor": "Huawei Technologies",
                        "version": "V200R021C00",
                        "user": "NOC-Team",
                        "role": "Core Switch",
                        "warranty_exp": "2028-12-31",
                        "uplink_speed": "100 Gbps",
                    },
                    tags={"Environment": "Production", "Criticality": "Tier-1", "Zone": "Backbone"},
                ),
                Device(
                    rack_id=racks_dict["A02"].id,
                    name="DC1-EDGE-FW-02",
                    device_type="Firewall",
                    model="FortiGate 701G",
                    manufacturer="Fortinet Inc.",
                    start_u=34,
                    height_u=2,
                    ip_address="10.220.20.2",
                    serial_number="FG701GTK24000189",
                    zabbix_host_id=find_zabbix_id("DC1-EDGE-FW-02"),
                    custom_fields={
                        "brand": "Fortinet",
                        "vendor": "Fortinet Inc.",
                        "version": "FortiOS 7.4.2",
                        "user": "SecOps-Team",
                        "role": "NextGen Firewall",
                        "warranty_exp": "2027-06-30",
                        "cluster_mode": "Active-Passive",
                    },
                    tags={"Environment": "Production", "Security_Level": "High", "Zone": "Perimeter"},
                ),

                # --- Rack B01 (Distribution Network) ---
                Device(
                    rack_id=racks_dict["B01"].id,
                    name="DC1-DIST-SW-01",
                    device_type="Switch",
                    model="Catalyst 9300-48P PoE+",
                    manufacturer="Cisco Systems",
                    start_u=36,
                    height_u=1,
                    ip_address="10.220.10.11",
                    serial_number="FOC241940KL",
                    zabbix_host_id=find_zabbix_id("DC1-DIST-SW-01"),
                    custom_fields={
                        "brand": "Cisco",
                        "vendor": "Cisco Systems",
                        "version": "IOS-XE 17.09.04a",
                        "user": "Network-Admin",
                        "role": "Distribution Switch",
                        "stack_id": "Stack-1",
                    },
                    tags={"Environment": "Production", "PoE_Status": "Enabled"},
                ),
                Device(
                    rack_id=racks_dict["B01"].id,
                    name="DC1-UPS-RACK-B",
                    device_type="UPS",
                    model="Smart-UPS RT 10kVA Online",
                    manufacturer="Schneider Electric (APC)",
                    start_u=1,
                    height_u=4,
                    ip_address="10.220.40.2",
                    serial_number="APC99482710399",
                    zabbix_host_id=find_zabbix_id("DC1-UPS-RACK-B"),
                    custom_fields={
                        "brand": "APC",
                        "vendor": "Schneider Electric",
                        "version": "NMC3 v4.2.1",
                        "user": "Facility-Team",
                        "role": "Online UPS 10kVA",
                        "battery_health": "100%",
                        "runtime_min": "48 min",
                    },
                    tags={"Facility": "Power", "Phase": "3-Phase", "Redundancy": "2N"},
                ),

                # --- Rack B02 (Enterprise Services) ---
                Device(
                    rack_id=racks_dict["B02"].id,
                    name="DC1-DIST-SW-02",
                    device_type="Switch",
                    model="Catalyst 9300-48P PoE+",
                    manufacturer="Cisco Systems",
                    start_u=36,
                    height_u=1,
                    ip_address="10.220.10.12",
                    serial_number="FOC241940KM",
                    zabbix_host_id=find_zabbix_id("DC1-DIST-SW-02"),
                    custom_fields={
                        "brand": "Cisco",
                        "vendor": "Cisco Systems",
                        "version": "IOS-XE 17.09.04a",
                        "user": "Network-Admin",
                        "role": "Distribution Switch",
                        "stack_id": "Stack-2",
                    },
                    tags={"Environment": "Production", "PoE_Status": "Enabled"},
                ),
                Device(
                    rack_id=racks_dict["B02"].id,
                    name="DC1-SRV-WIN-AD01",
                    device_type="Server",
                    model="UCS C220 M5 Rack Server",
                    manufacturer="Cisco Systems",
                    start_u=28,
                    height_u=1,
                    ip_address="10.220.50.41",
                    serial_number="WZP224508LK",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-WIN-AD01"),
                    custom_fields={
                        "brand": "Cisco",
                        "vendor": "Microsoft Corporation",
                        "version": "Windows Server 2022 Datacenter",
                        "user": "IT-Support",
                        "role": "Active Directory Domain Controller",
                        "domain": "corp.internal",
                    },
                    tags={"Environment": "Production", "OS": "Windows", "Auth": "Kerberos"},
                ),
                Device(
                    rack_id=racks_dict["B02"].id,
                    name="DC1-SRV-LOG-ELK01",
                    device_type="Server",
                    model="SuperServer 1029P-WTR",
                    manufacturer="Super Micro Computer",
                    start_u=20,
                    height_u=2,
                    ip_address="10.220.50.51",
                    serial_number="SM202394817290",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-LOG-ELK01"),
                    custom_fields={
                        "brand": "Supermicro",
                        "vendor": "Super Micro Computer",
                        "version": "Elasticsearch 8.13 / Debian 12",
                        "user": "SecOps-Team",
                        "role": "Central SIEM & Log Analyzer",
                        "retention_days": 180,
                    },
                    tags={"Environment": "Production", "Service": "Elasticsearch", "Disk": "NVMe"},
                ),

                # --- Rack B03 (Compute Cluster & Primary DB & Storage) ---
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="PP-01",
                    device_type="Patch Panel",
                    model="Cat6A 24-Port Patch Panel",
                    manufacturer="CommScope",
                    start_u=42,
                    height_u=1,
                    custom_fields={"brand": "CommScope", "vendor": "CommScope", "version": "Cat6A", "user": "NOC-Team"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="PP-02",
                    device_type="Patch Panel",
                    model="Cat6A 24-Port Patch Panel",
                    manufacturer="CommScope",
                    start_u=41,
                    height_u=1,
                    custom_fields={"brand": "CommScope", "vendor": "CommScope", "version": "Cat6A", "user": "NOC-Team"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="DC1-SRV-K8S-M01",
                    device_type="Server",
                    model="PowerEdge R750 2U",
                    manufacturer="Dell EMC",
                    start_u=26,
                    height_u=2,
                    ip_address="10.220.50.11",
                    serial_number="9JFKD02",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-K8S-M01"),
                    custom_fields={
                        "brand": "Dell",
                        "vendor": "RedHat / Dell EMC",
                        "version": "RHEL 9.3 (K8s v1.29)",
                        "user": "DevOps-Lead",
                        "role": "K8s Master Node 01",
                        "cores": 64,
                        "ram_gb": 256,
                    },
                    tags={"Cluster": "k8s-prod-dc1", "Role": "ControlPlane"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="DC1-SRV-K8S-W01",
                    device_type="Server",
                    model="PowerEdge R750 2U",
                    manufacturer="Dell EMC",
                    start_u=24,
                    height_u=2,
                    ip_address="10.220.50.21",
                    serial_number="9JFKD03",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-K8S-W01"),
                    custom_fields={
                        "brand": "Dell",
                        "vendor": "Canonical / Dell EMC",
                        "version": "Ubuntu 24.04 LTS (K8s v1.29)",
                        "user": "DevOps-Team",
                        "role": "K8s Worker Node 01",
                        "cores": 128,
                        "ram_gb": 512,
                    },
                    tags={"Cluster": "k8s-prod-dc1", "Role": "Worker"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="DC1-SRV-K8S-W02",
                    device_type="Server",
                    model="PowerEdge R750 2U",
                    manufacturer="Dell EMC",
                    start_u=22,
                    height_u=2,
                    ip_address="10.220.50.22",
                    serial_number="9JFKD04",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-K8S-W02"),
                    custom_fields={
                        "brand": "Dell",
                        "vendor": "Canonical / Dell EMC",
                        "version": "Ubuntu 24.04 LTS (K8s v1.29)",
                        "user": "DevOps-Team",
                        "role": "K8s Worker Node 02",
                        "cores": 128,
                        "ram_gb": 512,
                    },
                    tags={"Cluster": "k8s-prod-dc1", "Role": "Worker"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="DC1-SRV-PGSQL-01",
                    device_type="Server",
                    model="ProLiant DL380 Gen10 Plus",
                    manufacturer="Hewlett Packard Enterprise",
                    start_u=18,
                    height_u=2,
                    ip_address="10.220.50.31",
                    serial_number="SGH945X29Y",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-PGSQL-01"),
                    custom_fields={
                        "brand": "HPE",
                        "vendor": "Hewlett Packard Enterprise",
                        "version": "PostgreSQL 16.2 / RHEL 9",
                        "user": "DBA-Team",
                        "role": "Primary Database",
                        "db_cluster": "pg-patroni-prod",
                    },
                    tags={"DB": "PostgreSQL", "HA": "Patroni", "Replication": "Sync"},
                ),
                Device(
                    rack_id=racks_dict["B03"].id,
                    name="DC1-SAN-STOR-01",
                    device_type="Storage",
                    model="PowerStore 5000T All-Flash",
                    manufacturer="Dell EMC",
                    start_u=14,
                    height_u=2,
                    ip_address="10.220.30.1",
                    serial_number="CKM00194820199",
                    zabbix_host_id=find_zabbix_id("DC1-SAN-STOR-01"),
                    custom_fields={
                        "brand": "Dell",
                        "vendor": "Dell EMC",
                        "version": "PowerStoreOS 3.5.0.2",
                        "user": "Storage-Admin",
                        "role": "Enterprise All-Flash SAN",
                        "raw_capacity_tb": 120,
                        "usable_tb": 95,
                    },
                    tags={"Storage": "SAN", "Protocol": "NVMe-oF/FC", "Tier": "Hot"},
                ),

                # --- Rack B04 (Database Standby & App Services) ---
                Device(
                    rack_id=racks_dict["B04"].id,
                    name="DC1-SEC-PA-01",
                    device_type="Firewall",
                    model="PA-440 Next-Gen Firewall",
                    manufacturer="Palo Alto Networks",
                    start_u=32,
                    height_u=1,
                    ip_address="10.220.20.10",
                    serial_number="PA0189283749",
                    custom_fields={
                        "brand": "Palo Alto",
                        "vendor": "Palo Alto Networks",
                        "version": "PAN-OS 11.1.2",
                        "user": "SecOps-Team",
                        "role": "Branch Security Gateway",
                    },
                    tags={"Security": "PAN-OS", "Zone": "Edge"},
                ),
                Device(
                    rack_id=racks_dict["B04"].id,
                    name="DC1-SRV-APP-01",
                    device_type="Server",
                    model="PowerEdge R650 1U",
                    manufacturer="Dell EMC",
                    start_u=24,
                    height_u=1,
                    ip_address="10.220.50.35",
                    serial_number="8KSLD01",
                    custom_fields={
                        "brand": "Dell",
                        "vendor": "Dell Technologies",
                        "version": "AlmaLinux 9.3",
                        "user": "App-Team",
                        "role": "Microservices Node",
                    },
                    tags={"Cluster": "app-services", "Tier": "Frontend"},
                ),
                Device(
                    rack_id=racks_dict["B04"].id,
                    name="DC1-SRV-APP-02",
                    device_type="Server",
                    model="ProLiant DL360 Gen10",
                    manufacturer="Hewlett Packard Enterprise",
                    start_u=22,
                    height_u=1,
                    ip_address="10.220.50.36",
                    serial_number="SGH945X30A",
                    custom_fields={
                        "brand": "HPE",
                        "vendor": "Hewlett Packard Enterprise",
                        "version": "RHEL 9.3",
                        "user": "App-Team",
                        "role": "API Gateway Node",
                    },
                    tags={"Cluster": "app-services", "Tier": "Gateway"},
                ),
                Device(
                    rack_id=racks_dict["B04"].id,
                    name="DC1-SRV-PGSQL-02",
                    device_type="Server",
                    model="ProLiant DL380 Gen10 Plus",
                    manufacturer="Hewlett Packard Enterprise",
                    start_u=18,
                    height_u=2,
                    ip_address="10.220.50.32",
                    serial_number="SGH945X29Z",
                    zabbix_host_id=find_zabbix_id("DC1-SRV-PGSQL-02"),
                    custom_fields={
                        "brand": "HPE",
                        "vendor": "Hewlett Packard Enterprise",
                        "version": "PostgreSQL 16.2 / RHEL 9",
                        "user": "DBA-Team",
                        "role": "Standby Database",
                        "db_cluster": "pg-patroni-prod",
                    },
                    tags={"DB": "PostgreSQL", "HA": "Patroni", "Replication": "Async"},
                ),
            ]
            session.add_all(devices_to_create)
            await session.flush()
            print(f"[DB Seed] Successfully seeded {len(devices_to_create)} devices across Racks with Dynamic Custom Fields.")

        # Check Subnets
        result = await session.execute(select(Subnet))
        existing_subnets = result.scalars().all()
        if not existing_subnets:
            default_subnets = [
                Subnet(
                    name="Application Servers VLAN",
                    cidr="10.220.50.0/24",
                    vlan_id=50,
                    gateway="10.220.50.1",
                    dns_servers="10.220.10.2, 1.1.1.1",
                    description="Production App and DB Servers in DC1",
                ),
                Subnet(
                    name="Management Network VLAN",
                    cidr="192.168.100.0/24",
                    vlan_id=100,
                    gateway="192.168.100.1",
                    dns_servers="1.1.1.1, 8.8.8.8",
                    description="Out-of-band management (iDRAC, iLO, BMC, IPMI)",
                ),
                Subnet(
                    name="Storage SAN VLAN",
                    cidr="172.16.50.0/24",
                    vlan_id=500,
                    gateway="172.16.50.1",
                    dns_servers="1.1.1.1",
                    description="iSCSI / NVMe-oF High-Speed Storage Interconnect",
                ),
            ]
            session.add_all(default_subnets)
            await session.flush()
            print(f"[DB Seed] Seeded {len(default_subnets)} IPAM Subnets.")

        await session.commit()
        print("[DB Seed] Database initialization and seed completed.")



if __name__ == "__main__":
    import sys
    reset = "--reset" in sys.argv
    async def main():
        await init_tables()
        await seed_initial_data(reset_devices=reset)
    asyncio.run(main())
