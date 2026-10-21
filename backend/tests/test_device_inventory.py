import pytest
from backend.app.schemas import (
    DeviceResponse,
    DeviceOverviewResponse,
    ZabbixLatestItem,
    DeviceMetricHistoryPoint,
)
from backend.app.db.models import Device


def test_device_model_custom_fields():
    device = Device(
        rack_id=1,
        name="DC1-CORE-SW-01",
        device_type="Switch",
        model="CloudEngine 6885",
        manufacturer="Huawei",
        start_u=38,
        height_u=2,
        ip_address="10.220.10.1",
        serial_number="HW12345678",
        zabbix_host_id="11148",
        custom_fields={
            "brand": "Huawei",
            "vendor": "Huawei Technologies",
            "version": "V200R021C00",
            "user": "NOC-Team",
            "role": "Core Switch",
        },
        tags={"Environment": "Production"},
    )
    assert device.name == "DC1-CORE-SW-01"
    assert device.custom_fields["brand"] == "Huawei"
    assert device.custom_fields["vendor"] == "Huawei Technologies"
    assert device.custom_fields["version"] == "V200R021C00"
    assert device.custom_fields["user"] == "NOC-Team"
    assert device.tags["Environment"] == "Production"


def test_device_overview_schema():
    overview = DeviceOverviewResponse(
        device_id=1,
        device_name="DC1-CORE-SW-01",
        device_type="Switch",
        model="CloudEngine 6885",
        manufacturer="Huawei",
        rack_id=1,
        rack_name="Rack A01",
        room_name="Room A",
        start_u=38,
        height_u=2,
        position_face="Front",
        ip_address="10.220.10.1",
        serial_number="HW12345678",
        zabbix_host_id="11148",
        tags={"Criticality": "Tier-1"},
        custom_fields={
            "brand": "Huawei",
            "vendor": "Huawei Technologies",
            "version": "V200R021C00",
            "user": "NOC-Team",
        },
        cpu_utilization=42.5,
        memory_utilization=61.2,
        temperature_c=25.0,
        cpu_history=[DeviceMetricHistoryPoint(clock=1700000000, value=42.5)],
        active_alerts=[],
        latest_data_items=[
            ZabbixLatestItem(
                itemid="9999",
                name="CPU Utilization",
                key_="system.cpu.util",
                lastvalue="42.5",
                units="%",
                lastclock="1700000000",
            )
        ],
    )
    assert overview.custom_fields["brand"] == "Huawei"
    assert len(overview.latest_data_items) == 1
    assert overview.latest_data_items[0].key_ == "system.cpu.util"
    assert overview.latest_data_items[0].lastvalue == "42.5"


def test_resolve_brand_metadata_cisco():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="Catalyst 9300-48P PoE+",
        manufacturer="Cisco Systems",
        name="DC1-DIST-SW-01",
    )
    assert b["name"] == "Cisco"
    assert b["tag"] == "CISCO"
    assert b["color"] == "#00bceb"
    assert b["model_family"] == "Catalyst 9300"


def test_resolve_brand_metadata_huawei():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="CloudEngine 6885-48Y8C",
        manufacturer="Huawei Technologies",
        name="DC1-CORE-SW-01",
    )
    assert b["name"] == "Huawei"
    assert b["tag"] == "HUAWEI"
    assert b["color"] == "#cf0a2c"
    assert b["model_family"] == "CloudEngine 6885"


def test_resolve_brand_metadata_dell():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="PowerEdge R750 2U",
        manufacturer="Dell EMC",
        name="DC1-SRV-K8S-M01",
    )
    assert b["name"] == "Dell"
    assert b["tag"] == "DELL EMC"
    assert b["color"] == "#007db8"
    assert b["model_family"] == "PowerEdge R750"


def test_resolve_brand_metadata_hpe():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="ProLiant DL380 Gen10 Plus",
        manufacturer="Hewlett Packard Enterprise",
        name="DC1-SRV-PGSQL-01",
    )
    assert b["name"] == "HPE"
    assert b["tag"] == "HPE"
    assert b["color"] == "#01a982"
    assert "ProLiant DL380 Gen10" in b["model_family"]


def test_resolve_brand_metadata_fortinet():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="FortiGate 701G",
        manufacturer="Fortinet Inc.",
        name="DC1-EDGE-FW-01",
    )
    assert b["name"] == "Fortinet"
    assert b["tag"] == "FORTINET"
    assert b["color"] == "#ee3124"
    assert b["model_family"] == "FortiGate 701G"


def test_resolve_brand_metadata_palo_alto():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="PA-440 Next-Gen Firewall",
        manufacturer="Palo Alto Networks",
        name="DC1-SEC-PA-01",
    )
    assert b["name"] == "Palo Alto"
    assert b["tag"] == "PALO ALTO"
    assert b["color"] == "#fa582d"
    assert b["model_family"] == "PA-440"


def test_resolve_brand_metadata_apc():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="Smart-UPS RT 10kVA Online",
        manufacturer="Schneider Electric (APC)",
        name="DC1-UPS-RACK-A",
    )
    assert b["name"] == "APC"
    assert b["tag"] == "APC"
    assert b["color"] == "#00873d"
    assert "Smart-UPS RT 10kVA" in b["model_family"]


def test_resolve_brand_metadata_fallback():
    from backend.app.services.brand_service import resolve_brand_metadata
    b = resolve_brand_metadata(
        model="Custom Whitebox Server",
        manufacturer="SuperSpecialTech",
        name="DC1-SRV-CUSTOM-01",
    )
    assert b["name"] == "SuperSpecialTech"
    assert b["color"] == "#8bd7d1"
    assert b["badge_class"] == "bg-[#273139] border-[#50626f] text-[#caedde]"


def test_catalog_service_all_templates():
    from backend.app.services.catalog_service import get_hardware_templates
    templates = get_hardware_templates()
    assert len(templates) >= 15

    # Check Dell R750
    r750 = next((t for t in templates if t.id == "dell-poweredge-r750"), None)
    assert r750 is not None
    assert r750.brand == "Dell"
    assert r750.model == "PowerEdge R750"
    assert r750.device_type == "Server"
    assert r750.height_u == 2
    assert r750.brand_info is not None
    assert r750.brand_info.tag == "DELL EMC"

    # Check Cisco Catalyst
    c9300 = next((t for t in templates if t.id == "cisco-catalyst-9300-48p"), None)
    assert c9300 is not None
    assert c9300.brand == "Cisco"
    assert c9300.height_u == 1
    assert c9300.brand_info.tag == "CISCO"

    # Check Fortinet
    fg701 = next((t for t in templates if t.id == "fortinet-fortigate-701g"), None)
    assert fg701 is not None
    assert fg701.brand == "Fortinet"
    assert fg701.height_u == 2


def test_catalog_service_filtering():
    from backend.app.services.catalog_service import get_hardware_templates
    # Filter by brand
    dell_only = get_hardware_templates(brand="Dell")
    assert len(dell_only) >= 3
    assert all(t.brand == "Dell" for t in dell_only)

    # Filter by category
    firewalls = get_hardware_templates(category="Firewall")
    assert len(firewalls) >= 3
    assert all(t.device_type == "Firewall" for t in firewalls)

