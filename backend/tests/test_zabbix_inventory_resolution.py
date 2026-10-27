import pytest
from backend.app.services.zabbix_service import ZabbixService


def test_resolve_inventory_from_zabbix_inventory_object():
    """Test resolution when Zabbix host has inventory object populated"""
    raw_inventory = {
        "os": "AlmaLinux 9.4 (Blue Onyx)",
        "os_full": "AlmaLinux release 9.4 (Blue Onyx)",
        "hw_arch": "x86_64",
        "serialno_a": "SRV-DELL-98234-A",
        "macaddress_a": "52:54:00:12:34:56",
        "model": "PowerEdge R750",
        "vendor": "Dell EMC",
        "location": "Room A / Rack B03 / U26-U27",
        "asset_tag": "AST-2026-0042",
        "inventory_mode": "0",
    }
    resolved = ZabbixService.resolve_host_inventory(inventory=raw_inventory)

    assert resolved["os"] == "AlmaLinux 9"
    assert resolved["os_full"] == "AlmaLinux release 9.4 (Blue Onyx)"
    assert resolved["os_arch"] == "x86_64"
    assert resolved["serial_number"] == "SRV-DELL-98234-A"
    assert resolved["mac_address"] == "52:54:00:12:34:56"
    assert resolved["hardware_model"] == "PowerEdge R750"
    assert resolved["vendor"] == "Dell EMC"
    assert resolved["asset_tag"] == "AST-2026-0042"


def test_resolve_inventory_from_items_when_inventory_disabled():
    """Test fallback item extraction when host inventory_mode is -1 (Disabled)"""
    raw_inventory = {
        "inventory_mode": "-1",
    }
    items = [
        {
            "name": "Operating system",
            "key_": "system.sw.os",
            "lastvalue": "Linux version 5.14.0-687.29.1.el9_8.x86_64 (mockbuild@x64-builder02.almalinux.org) ...",
        },
        {
            "name": "Operating system architecture",
            "key_": "system.sw.arch",
            "lastvalue": "x86_64",
        },
        {
            "name": "System description",
            "key_": "system.uname",
            "lastvalue": "Linux zabbix-server-190.local 5.14.0-687.29.1.el9_8.x86_64 #1 SMP PREEMPT_DYNAMIC",
        },
        {
            "name": "System name",
            "key_": "system.hostname",
            "lastvalue": "zabbix-server-190.local",
        },
        {
            "name": "Number of CPUs",
            "key_": "system.cpu.num",
            "lastvalue": "4",
        },
    ]
    resolved = ZabbixService.resolve_host_inventory(inventory=raw_inventory, items=items)

    assert resolved["os"] == "AlmaLinux 9"
    assert resolved["os_arch"] == "x86_64"
    assert "Linux zabbix-server-190.local" in resolved["kernel"]
    assert resolved["cpu_cores"] == 4
    assert resolved["hostname"] == "zabbix-server-190.local"
