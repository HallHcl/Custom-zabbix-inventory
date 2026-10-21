import asyncio
import uuid
from datetime import date, datetime, timedelta
import random
from typing import List, Dict

from sqlalchemy import select, delete, text
from backend.app.db.session import engine, AsyncSessionLocal
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


def random_embedding(dim: int = 1536) -> List[float]:
    """Generate a normalized mock vector embedding for pgvector"""
    vec = [random.uniform(-0.05, 0.05) for _ in range(dim)]
    # Normalize length
    norm = sum(x * x for x in vec) ** 0.5
    return [x / norm for x in vec] if norm > 0 else vec


async def seed_datacenter(force_clean: bool = True):
    """
    Populates Bangkok DC-1 Datacenter with complete NexusTwin digital twin data:
    - 1 Site (Bangkok DC-1)
    - 1 Building (Facility Building A)
    - 2 Data Halls (Alpha & Beta)
    - 4 Rows (Row A, B, C, D)
    - 24 Racks (42U cabinets with meter positions and Zabbix item mapping)
    - 10 Hardware Models (Dell, Cisco, Fortinet, NetApp, APC, Vertiv)
    - 60 Realistic Devices (Servers, ToR Switches, Firewalls, Storage, PDUs)
    - 120+ Power & Network Cable Connections
    - 3 Knowledge Documents with 1536-dim embeddings
    - 3 IPAM Subnets
    """
    async with AsyncSessionLocal() as session:
        print("[Seeder] Starting NexusTwin Bangkok DC-1 demo datacenter population...")

        if force_clean:
            print("[Seeder] Cleaning existing tables for a clean slate...")
            await session.execute(delete(DeviceConnection))
            await session.execute(delete(Device))
            await session.execute(delete(Rack))
            await session.execute(delete(Row))
            await session.execute(delete(Room))
            await session.execute(delete(Building))
            await session.execute(delete(Site))
            await session.execute(delete(DeviceModel))
            await session.execute(delete(KnowledgeDocument))
            await session.execute(delete(Subnet))
            await session.commit()

        # ====================================================================
        # 1. HARDWARE DEVICE MODELS (10 Catalog Templates)
        # ====================================================================
        print("[Seeder] 1. Creating 10 Hardware Device Models...")
        models_data = [
            {
                "manufacturer": "Dell Technologies",
                "model_name": "PowerEdge R760",
                "category": "SERVER",
                "u_height": 2,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 480,
                "weight_kg": 24.5,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "iDRAC", "type": "RJ45_1G"},
                    {"name": "eth0", "type": "SFP28_25G"},
                    {"name": "eth1", "type": "SFP28_25G"},
                ],
            },
            {
                "manufacturer": "Dell Technologies",
                "model_name": "PowerEdge R660",
                "category": "SERVER",
                "u_height": 1,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 320,
                "weight_kg": 16.8,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "iDRAC", "type": "RJ45_1G"},
                    {"name": "eth0", "type": "RJ45_10G"},
                    {"name": "eth1", "type": "RJ45_10G"},
                ],
            },
            {
                "manufacturer": "Dell Technologies",
                "model_name": "PowerEdge MX7000",
                "category": "SERVER",
                "u_height": 7,
                "is_full_depth": True,
                "is_chassis": True,
                "typical_power_watts": 2600,
                "weight_kg": 105.0,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C20"},
                    {"name": "PSU-2", "type": "POWER_C20"},
                    {"name": "PSU-3", "type": "POWER_C20"},
                    {"name": "PSU-4", "type": "POWER_C20"},
                    {"name": "OME-1", "type": "RJ45_1G"},
                ],
            },
            {
                "manufacturer": "Cisco Systems",
                "model_name": "Catalyst 9300-48UXM",
                "category": "SWITCH",
                "u_height": 1,
                "is_full_depth": False,
                "is_chassis": False,
                "typical_power_watts": 250,
                "weight_kg": 8.2,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "Mgmt0", "type": "RJ45_1G"},
                    {"name": "Te1/0/1", "type": "SFP+_10G"},
                    {"name": "Te1/0/2", "type": "SFP+_10G"},
                ],
            },
            {
                "manufacturer": "Cisco Systems",
                "model_name": "Nexus 9336C-FX2",
                "category": "SWITCH",
                "u_height": 1,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 380,
                "weight_kg": 9.5,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "Mgmt0", "type": "RJ45_1G"},
                    {"name": "Eth1/1", "type": "QSFP28_100G"},
                    {"name": "Eth1/2", "type": "QSFP28_100G"},
                ],
            },
            {
                "manufacturer": "Fortinet",
                "model_name": "FortiGate 200F",
                "category": "FIREWALL",
                "u_height": 1,
                "is_full_depth": False,
                "is_chassis": False,
                "typical_power_watts": 140,
                "weight_kg": 6.5,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "mgmt", "type": "RJ45_1G"},
                    {"name": "wan1", "type": "SFP+_10G"},
                    {"name": "port1", "type": "RJ45_1G"},
                ],
            },
            {
                "manufacturer": "NetApp",
                "model_name": "NetApp AFF A400",
                "category": "STORAGE",
                "u_height": 4,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 1200,
                "weight_kg": 46.0,
                "default_ports_json": [
                    {"name": "PSU-1", "type": "POWER_C14"},
                    {"name": "PSU-2", "type": "POWER_C14"},
                    {"name": "e0M", "type": "RJ45_1G"},
                    {"name": "e0a", "type": "SFP28_25G"},
                    {"name": "e0b", "type": "SFP28_25G"},
                ],
            },
            {
                "manufacturer": "Schneider Electric / APC",
                "model_name": "AP8841 Metered Rack PDU",
                "category": "PDU",
                "u_height": 0,
                "is_full_depth": False,
                "is_chassis": False,
                "typical_power_watts": 25,
                "weight_kg": 6.8,
                "default_ports_json": [
                    {"name": "Outlet-1", "type": "C13"},
                    {"name": "Outlet-2", "type": "C13"},
                    {"name": "Outlet-3", "type": "C13"},
                    {"name": "Outlet-4", "type": "C13"},
                    {"name": "Outlet-5", "type": "C19"},
                ],
            },
            {
                "manufacturer": "Schneider Electric / APC",
                "model_name": "Smart-UPS RT 10kVA",
                "category": "UPS",
                "u_height": 6,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 450,
                "weight_kg": 110.0,
                "default_ports_json": [
                    {"name": "Input-Main", "type": "TERMINAL_BLOCK"},
                    {"name": "Output-PDU-A", "type": "TERMINAL_BLOCK"},
                    {"name": "NMC3", "type": "RJ45_1G"},
                ],
            },
            {
                "manufacturer": "Vertiv",
                "model_name": "Liebert CRV Row CRAC",
                "category": "CRAC",
                "u_height": 0,
                "is_full_depth": True,
                "is_chassis": False,
                "typical_power_watts": 3800,
                "weight_kg": 340.0,
                "default_ports_json": [
                    {"name": "Power-Feed", "type": "3PH_TERMINAL"},
                    {"name": "Modbus-IP", "type": "RJ45_1G"},
                ],
            },
        ]

        model_map: Dict[str, DeviceModel] = {}
        for m in models_data:
            dev_model = DeviceModel(**m)
            session.add(dev_model)
            model_map[m["model_name"]] = dev_model
        await session.flush()

        # ====================================================================
        # 2. SITES & BUILDINGS
        # ====================================================================
        print("[Seeder] 2. Creating Site (Bangkok DC-1) & Building A...")
        site = Site(
            name="Bangkok DC-1",
            slug="bkk-dc1",
            region="APAC / Thailand",
            address="888 Rama IV Road, Khlong Toei, Bangkok 10110, Thailand",
            latitude=13.724441,
            longitude=100.564756,
            contact_name="Somchai Prasert",
            contact_phone="+66 2 123 4567",
        )
        session.add(site)
        await session.flush()

        building = Building(
            site_id=site.id,
            name="Facility Building A",
            floors_count=3,
            total_power_capacity_kw=1200.00,
        )
        session.add(building)
        await session.flush()

        # ====================================================================
        # 3. ROOMS / DATA HALLS (2 Rooms: Alpha & Beta)
        # ====================================================================
        print("[Seeder] 3. Creating 2 Data Halls (Alpha & Beta)...")
        hall_alpha = Room(
            building_id=building.id,
            name="Data Hall Alpha",
            floor_level=1,
            width_meters=24.0,
            length_meters=36.0,
            max_kw_capacity=450.0,
            max_cooling_btu=1535000.0,
            blueprint_svg_url="/blueprints/bkk_hall_alpha.svg",
        )
        hall_beta = Room(
            building_id=building.id,
            name="Data Hall Beta",
            floor_level=2,
            width_meters=20.0,
            length_meters=28.0,
            max_kw_capacity=350.0,
            max_cooling_btu=1194000.0,
            blueprint_svg_url="/blueprints/bkk_hall_beta.svg",
        )
        session.add_all([hall_alpha, hall_beta])
        await session.flush()

        # ====================================================================
        # 4. ROWS (4 Rows: A, B in Alpha; C, D in Beta)
        # ====================================================================
        print("[Seeder] 4. Creating 4 Rows...")
        row_a = Row(
            room_id=hall_alpha.id,
            name="Row A",
            aisle_type="COLD_CONTAINED",
            pos_x_meters=4.0,
            pos_y_meters=6.0,
            orientation_deg=0,
        )
        row_b = Row(
            room_id=hall_alpha.id,
            name="Row B",
            aisle_type="COLD_CONTAINED",
            pos_x_meters=4.0,
            pos_y_meters=14.0,
            orientation_deg=0,
        )
        row_c = Row(
            room_id=hall_beta.id,
            name="Row C",
            aisle_type="HOT_CONTAINED",
            pos_x_meters=3.5,
            pos_y_meters=5.5,
            orientation_deg=0,
        )
        row_d = Row(
            room_id=hall_beta.id,
            name="Row D",
            aisle_type="HOT_CONTAINED",
            pos_x_meters=3.5,
            pos_y_meters=13.0,
            orientation_deg=0,
        )
        rows = [row_a, row_b, row_c, row_d]
        session.add_all(rows)
        await session.flush()

        # ====================================================================
        # 5. RACKS (24 Cabinets: 6 per Row, 42U)
        # ====================================================================
        print("[Seeder] 5. Creating 24 Cabinets across 4 Rows...")
        racks_list: List[Rack] = []
        rack_index = 100

        for r_obj in rows:
            row_prefix = r_obj.name.split()[-1]  # 'A', 'B', 'C', 'D'
            for idx in range(1, 7):
                rack_name = f"R-{row_prefix}{idx:02d}"
                rack_index += 1
                rack = Rack(
                    row_id=r_obj.id,
                    name=rack_name,
                    u_height=42,
                    pos_x_meters=float(r_obj.pos_x_meters + (idx - 1) * 1.8),
                    pos_y_meters=float(r_obj.pos_y_meters),
                    rotation_deg=0,
                    max_power_watts=8000 if row_prefix in ["A", "B"] else 10000,
                    max_weight_kg=1000 if row_prefix in ["A", "B"] else 1200,
                    # Zabbix item keys mapped for digital twin telemetry
                    zabbix_inlet_temp_itemid=f"item_inlet_{rack_name.lower()}",
                    zabbix_exhaust_temp_itemid=f"item_exhaust_{rack_name.lower()}",
                    zabbix_humidity_itemid=f"item_humid_{rack_name.lower()}",
                    zabbix_pdu_a_power_itemid=f"item_pdu_a_{rack_name.lower()}",
                    zabbix_pdu_b_power_itemid=f"item_pdu_b_{rack_name.lower()}",
                )
                session.add(rack)
                racks_list.append(rack)
        await session.flush()

        # ====================================================================
        # 6. DEVICES (60 Realistic Devices)
        # ====================================================================
        print("[Seeder] 6. Creating 60 Realistic Devices...")
        devices_list: List[Device] = []
        departments = ["Core Infrastructure", "Cloud Platform", "Database Services", "Cyber Security", "AI & Analytics"]
        projects = ["Phoenix Migration", "Atlas Kubernetes", "Oracle Exa-DB", "ZeroTrust Perimeter", "Titan ML Pipeline"]

        device_counter = 1
        today = date.today()

        # We will populate the first 12 racks with 3-5 devices each = ~60 devices
        for r_idx, target_rack in enumerate(racks_list[:14]):
            r_room_id = hall_alpha.id if r_idx < 12 else hall_beta.id

            # 1. Top of Rack Switch (at U41 or U42)
            sw_model = model_map["Nexus 9336C-FX2"] if r_idx % 2 == 0 else model_map["Catalyst 9300-48UXM"]
            tor_switch = Device(
                device_model_id=sw_model.id,
                rack_id=target_rack.id,
                room_id=r_room_id,
                name=f"SW-TOR-{target_rack.name}",
                hostname=f"sw-tor-{target_rack.name.lower()}.dc.internal",
                zabbix_hostid=f"10{device_counter:03d}",
                u_position_start=41,
                rack_face="FRONT",
                management_ip=f"10.10.1.{device_counter}",
                oob_ip=f"10.10.100.{device_counter}",
                oob_type="SSH",
                serial_number=f"FOC{device_counter:04d}NET",
                asset_tag=f"AST-SW-{device_counter:04d}",
                status="ACTIVE",
                owner_department="Core Infrastructure",
                project_name="Network Spine-Leaf",
                purchase_date=today - timedelta(days=400 + device_counter * 5),
                warranty_expiry_date=today + timedelta(days=600 - device_counter * 5),
                vendor_contract_id=f"CISCO-SMARTNET-{device_counter}",
                purchase_cost_usd=9500.00,
            )
            session.add(tor_switch)
            devices_list.append(tor_switch)
            device_counter += 1

            # 2. Dual Smart PDUs (0U vertical on sides)
            pdu_model = model_map["AP8841 Metered Rack PDU"]
            pdu_a = Device(
                device_model_id=pdu_model.id,
                rack_id=target_rack.id,
                room_id=r_room_id,
                name=f"PDU-A-{target_rack.name}",
                hostname=f"pdu-a-{target_rack.name.lower()}.pwr.internal",
                zabbix_hostid=f"10{device_counter:03d}",
                u_position_start=None,
                rack_face="REAR",
                management_ip=f"10.10.5.{device_counter}",
                oob_type="HTTPS",
                serial_number=f"ZA{device_counter:05d}PDUA",
                asset_tag=f"AST-PDU-A-{device_counter:04d}",
                status="ACTIVE",
                owner_department="Facilities & Power",
                purchase_cost_usd=1250.00,
            )
            session.add(pdu_a)
            devices_list.append(pdu_a)
            device_counter += 1

            pdu_b = Device(
                device_model_id=pdu_model.id,
                rack_id=target_rack.id,
                room_id=r_room_id,
                name=f"PDU-B-{target_rack.name}",
                hostname=f"pdu-b-{target_rack.name.lower()}.pwr.internal",
                zabbix_hostid=f"10{device_counter:03d}",
                u_position_start=None,
                rack_face="REAR",
                management_ip=f"10.10.5.{device_counter}",
                oob_type="HTTPS",
                serial_number=f"ZB{device_counter:05d}PDUB",
                asset_tag=f"AST-PDU-B-{device_counter:04d}",
                status="ACTIVE",
                owner_department="Facilities & Power",
                purchase_cost_usd=1250.00,
            )
            session.add(pdu_b)
            devices_list.append(pdu_b)
            device_counter += 1

            # 3. Servers in this rack (2 to 4 servers)
            u_positions = [10, 16, 24, 32]
            for u_slot in u_positions:
                if device_counter > 60:
                    break
                is_2u = (u_slot % 2 == 0)
                srv_model = model_map["PowerEdge R760"] if is_2u else model_map["PowerEdge R660"]
                dept = departments[device_counter % len(departments)]
                proj = projects[device_counter % len(projects)]

                # Status variation: few staging or maintenance
                dev_status = "ACTIVE"
                if device_counter == 15:
                    dev_status = "MAINTENANCE"
                elif device_counter == 28:
                    dev_status = "STAGED"

                server = Device(
                    device_model_id=srv_model.id,
                    rack_id=target_rack.id,
                    room_id=r_room_id,
                    name=f"SRV-{proj[:3].upper()}-{target_rack.name}-U{u_slot:02d}",
                    hostname=f"srv-{target_rack.name.lower()}-u{u_slot}.corp.internal",
                    zabbix_hostid=f"10{device_counter:03d}",
                    u_position_start=u_slot,
                    rack_face="FRONT",
                    management_ip=f"10.10.20.{device_counter}",
                    oob_ip=f"10.10.120.{device_counter}",
                    oob_type="IDRAC",
                    serial_number=f"CN0{device_counter:05d}DELL",
                    asset_tag=f"AST-SRV-{device_counter:04d}",
                    status=dev_status,
                    owner_department=dept,
                    project_name=proj,
                    purchase_date=today - timedelta(days=200 + device_counter * 8),
                    warranty_expiry_date=today + timedelta(days=400 + device_counter * 10),
                    vendor_contract_id=f"PROSUPPORT-{device_counter:04d}",
                    purchase_cost_usd=11200.00 if is_2u else 7800.00,
                )
                session.add(server)
                devices_list.append(server)
                device_counter += 1

        # Add 2 Firewalls and 2 Storage Systems in R-A01 and R-B01
        fw_model = model_map["FortiGate 200F"]
        fw1 = Device(
            device_model_id=fw_model.id,
            rack_id=racks_list[0].id,
            room_id=hall_alpha.id,
            name="FW-EDGE-PRIM-01",
            hostname="fw-edge-01.sec.internal",
            zabbix_hostid="10099",
            u_position_start=39,
            rack_face="FRONT",
            management_ip="10.10.0.1",
            oob_ip="10.10.100.1",
            oob_type="HTTPS",
            serial_number="FG200FTK21000001",
            asset_tag="AST-FW-0001",
            status="ACTIVE",
            owner_department="Cyber Security",
            project_name="Perimeter Defense",
            purchase_cost_usd=14500.00,
        )
        session.add(fw1)
        devices_list.append(fw1)

        storage_model = model_map["NetApp AFF A400"]
        san1 = Device(
            device_model_id=storage_model.id,
            rack_id=racks_list[1].id,
            room_id=hall_alpha.id,
            name="SAN-NVME-FLASH-01",
            hostname="san-a400-01.storage.internal",
            zabbix_hostid="10100",
            u_position_start=2,
            rack_face="FRONT",
            management_ip="10.10.30.1",
            oob_ip="10.10.130.1",
            oob_type="HTTPS",
            serial_number="NETAPP40019283",
            asset_tag="AST-SAN-0001",
            status="ACTIVE",
            owner_department="Database Services",
            project_name="Oracle Exa-DB",
            purchase_cost_usd=48000.00,
        )
        session.add(san1)
        devices_list.append(san1)

        await session.flush()
        print(f"[Seeder] Total devices created: {len(devices_list)}")

        # ====================================================================
        # 7. DEVICE CONNECTIONS (Dual Power A/B & ToR Network Cabling)
        # ====================================================================
        print("[Seeder] 7. Creating Device Connections (Dual Power & Network Cabling)...")
        connections_count = 0

        # Group devices by rack
        rack_devices: Dict[uuid.UUID, List[Device]] = {}
        for d in devices_list:
            if d.rack_id:
                rack_devices.setdefault(d.rack_id, []).append(d)

        for r_id, devs in rack_devices.items():
            pdu_a = next((d for d in devs if "PDU-A" in d.name), None)
            pdu_b = next((d for d in devs if "PDU-B" in d.name), None)
            tor_sw = next((d for d in devs if "SW-TOR" in d.name), None)
            servers = [d for d in devs if d.u_position_start and d.u_position_start < 40]

            for srv_idx, srv in enumerate(servers):
                # 1. Dual Power Cabling
                if pdu_a:
                    c_pwr_a = DeviceConnection(
                        source_device_id=srv.id,
                        source_port_name="PSU-1",
                        target_device_id=pdu_a.id,
                        target_port_name=f"Outlet-{srv_idx + 1}",
                        connection_type="POWER_A",
                        cable_color="#3b82f6",  # Blue for Feed A
                        cable_label=f"{srv.name}-PWR-A",
                    )
                    session.add(c_pwr_a)
                    connections_count += 1

                # Feed B (Intentionally leave 1-2 single-corded servers to trigger Redundancy warning in tests!)
                if pdu_b and srv_idx != 2:
                    c_pwr_b = DeviceConnection(
                        source_device_id=srv.id,
                        source_port_name="PSU-2",
                        target_device_id=pdu_b.id,
                        target_port_name=f"Outlet-{srv_idx + 1}",
                        connection_type="POWER_B",
                        cable_color="#ef4444",  # Red for Feed B
                        cable_label=f"{srv.name}-PWR-B",
                    )
                    session.add(c_pwr_b)
                    connections_count += 1

                # 2. Network Uplink to ToR Switch
                if tor_sw:
                    c_net = DeviceConnection(
                        source_device_id=srv.id,
                        source_port_name="eth0",
                        target_device_id=tor_sw.id,
                        target_port_name=f"Te1/0/{srv_idx + 1}",
                        connection_type="FIBER_MM",
                        cable_color="#10b981",  # Emerald
                        cable_label=f"{srv.name}-UPLINK-1",
                        bandwidth_gbps=25,
                    )
                    session.add(c_net)
                    connections_count += 1

        await session.flush()
        print(f"[Seeder] Total connections created: {connections_count}")

        # ====================================================================
        # 8. KNOWLEDGE DOCUMENTS (pgvector 1536-dim embeddings)
        # ====================================================================
        print("[Seeder] 8. Creating Knowledge Documents with pgvector embeddings...")
        docs = [
            KnowledgeDocument(
                title="SOP-DC-001: Emergency CRAC Failure & Thermal Runaway Protocol",
                doc_type="SOP",
                content=(
                    "When room inlet temperatures breach 28°C or a CRAC unit trips off-line, "
                    "immediately activate the secondary Liebert CRV unit, initiate cold aisle ceiling venting, "
                    "and notify NOC Level-2. If temperatures exceed 32°C within 15 minutes, prepare emergency "
                    "load shedding by migrating VM workloads to Data Hall Beta."
                ),
                embedding=random_embedding(1536),
            ),
            KnowledgeDocument(
                title="SOP-DC-002: Dual-Corded Power Redundancy & PDU Load Shedding",
                doc_type="SOP",
                content=(
                    "All Tier-3 production servers must maintain concurrent dual-feed connections to PDU-A and PDU-B. "
                    "Single-corded servers violate SLA and create critical failover risks. When total rack load "
                    "exceeds 50% capacity, warn the data hall supervisor as single-feed circuit tripping will occur "
                    "upon primary branch failover."
                ),
                embedding=random_embedding(1536),
            ),
            KnowledgeDocument(
                title="HARDWARE-MANUAL-003: Dell PowerEdge R760 Maintenance & iDRAC Diagnostics",
                doc_type="HARDWARE_MANUAL",
                content=(
                    "Dell PowerEdge R760 2U enterprise server diagnostics guide. Out-of-band management via dedicated "
                    "iDRAC9 Enterprise port. Cold swap redundant power supply units (Titanium 1400W). Optical transceiver "
                    "SFP28 25GbE replacement procedures and LED status matrix."
                ),
                embedding=random_embedding(1536),
            ),
        ]
        session.add_all(docs)
        await session.flush()

        # ====================================================================
        # 9. SUBNETS (IPAM Management)
        # ====================================================================
        print("[Seeder] 9. Creating IPAM Subnets...")
        subnets = [
            Subnet(
                name="Management & OOB VLAN",
                cidr="10.10.100.0/24",
                vlan_id=100,
                gateway="10.10.100.1",
                dns_servers="1.1.1.1, 8.8.8.8",
                description="iDRAC, iLO, Switch Mgmt0, PDU Network Cards",
            ),
            Subnet(
                name="Server Production Tier-1",
                cidr="10.10.20.0/24",
                vlan_id=20,
                gateway="10.10.20.1",
                dns_servers="10.10.20.2, 1.1.1.1",
                description="High-density compute nodes & Kubernetes worker pools",
            ),
            Subnet(
                name="Storage NVMe-oF & SAN",
                cidr="10.10.30.0/24",
                vlan_id=30,
                gateway="10.10.30.1",
                dns_servers="1.1.1.1",
                description="NetApp AFF dedicated storage cluster network",
            ),
        ]
        session.add_all(subnets)
        await session.commit()

        print("[Seeder] ============================================================")
        print(f"[Seeder] SUCCESS! Bangkok DC-1 Datacenter populated in dcim_db.")
        print(f"[Seeder] - 1 Site, 1 Building, 2 Data Halls, 4 Rows, 24 Racks")
        print(f"[Seeder] - 10 Device Models, {len(devices_list)} Devices, {connections_count} Cabling Connections")
        print(f"[Seeder] - 3 Vectorized Knowledge Docs, 3 Subnets")
        print("[Seeder] ============================================================")


if __name__ == "__main__":
    asyncio.run(seed_datacenter(force_clean=True))
