import pytest
from backend.app.db.models import Subnet, Device
from backend.app.schemas import (
    SubnetCreate,
    SubnetResponse,
    SubnetIPDetail,
    DeviceResponse,
)


def test_subnet_model_instantiation():
    subnet = Subnet(
        name="Application Servers VLAN",
        cidr="10.220.50.0/24",
        vlan_id=50,
        gateway="10.220.50.1",
        dns_servers="10.220.10.2, 1.1.1.1",
        description="Production App and DB Servers in DC1",
    )
    assert subnet.name == "Application Servers VLAN"
    assert subnet.cidr == "10.220.50.0/24"
    assert subnet.vlan_id == 50
    assert subnet.gateway == "10.220.50.1"
    assert subnet.dns_servers == "10.220.10.2, 1.1.1.1"


def test_device_model_status_field():
    # Test default status is Active
    device_default = Device(
        rack_id=1,
        name="SRV-PROD-01",
        start_u=10,
        height_u=2,
    )
    assert device_default.status == "Active"

    # Test explicit status
    device_maint = Device(
        rack_id=1,
        name="SRV-MAINT-01",
        start_u=12,
        height_u=1,
        status="Maintenance",
    )
    assert device_maint.status == "Maintenance"


def test_subnet_schemas():
    # Test SubnetCreate schema
    create_schema = SubnetCreate(
        name="DMZ Web Subnet",
        cidr="172.16.10.0/24",
        vlan_id=10,
        gateway="172.16.10.1",
        description="Public facing web cluster",
    )
    assert create_schema.name == "DMZ Web Subnet"
    assert create_schema.cidr == "172.16.10.0/24"

    # Test SubnetResponse schema
    response_schema = SubnetResponse(
        id=1,
        name="DMZ Web Subnet",
        cidr="172.16.10.0/24",
        vlan_id=10,
        gateway="172.16.10.1",
        total_ips=254,
        used_ips=34,
        free_ips=220,
        utilization_percent=13.39,
    )
    assert response_schema.total_ips == 254
    assert response_schema.used_ips == 34
    assert response_schema.free_ips == 220
    assert response_schema.utilization_percent == 13.39


def test_subnet_ip_detail_schema():
    ip_detail = SubnetIPDetail(
        ip="10.220.50.10",
        status="assigned",
        device_id=5,
        device_name="DC1-SRV-APP-01",
        zabbix_host_id="10555",
        is_gateway=False,
    )
    assert ip_detail.ip == "10.220.50.10"
    assert ip_detail.status == "assigned"
    assert ip_detail.device_name == "DC1-SRV-APP-01"
