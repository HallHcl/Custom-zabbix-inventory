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
