import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_ipam_crud_and_allocation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List existing subnets (seeded in Task 1)
        list_resp = await client.get("/api/v1/ipam/subnets")
        assert list_resp.status_code == 200
        subnets = list_resp.json()
        assert len(subnets) >= 3

        # Verify utilization calculation
        app_subnet = next((s for s in subnets if "10.220.50.0" in s["cidr"]), None)
        assert app_subnet is not None
        assert app_subnet["total_ips"] == 254
        assert app_subnet["used_ips"] > 0
        assert app_subnet["utilization_percent"] > 0.0

        # 2. Test Invalid CIDR validation
        bad_cidr_resp = await client.post("/api/v1/ipam/subnets", json={
            "name": "Invalid Subnet",
            "cidr": "10.99.10.0/99",
        })
        assert bad_cidr_resp.status_code == 400
        assert "invalid cidr" in bad_cidr_resp.json()["detail"].lower()

        # 3. Test Gateway outside CIDR validation
        bad_gw_resp = await client.post("/api/v1/ipam/subnets", json={
            "name": "Mismatched Gateway",
            "cidr": "10.99.10.0/24",
            "gateway": "192.168.1.1",
        })
        assert bad_gw_resp.status_code == 400
        assert "outside of subnet cidr" in bad_gw_resp.json()["detail"].lower()

        # 4. Create new valid subnet
        new_subnet_payload = {
            "name": "Dev & Staging Cluster",
            "cidr": "10.99.10.0/24",
            "vlan_id": 99,
            "gateway": "10.99.10.1",
            "dns_servers": "1.1.1.1, 8.8.8.8",
            "description": "Integration testing environment",
        }
        create_resp = await client.post("/api/v1/ipam/subnets", json=new_subnet_payload)
        assert create_resp.status_code == 200
        created = create_resp.json()
        subnet_id = created["id"]
        assert created["name"] == "Dev & Staging Cluster"
        assert created["total_ips"] == 254
        assert created["used_ips"] == 1  # Gateway counted

        # 5. Test Duplicate CIDR validation
        dup_resp = await client.post("/api/v1/ipam/subnets", json=new_subnet_payload)
        assert dup_resp.status_code == 400
        assert "already exists" in dup_resp.json()["detail"].lower()

        # 6. Fetch single subnet
        get_resp = await client.get(f"/api/v1/ipam/subnets/{subnet_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["cidr"] == "10.99.10.0/24"

        # 7. Update subnet
        patch_resp = await client.patch(f"/api/v1/ipam/subnets/{subnet_id}", json={
            "description": "Updated staging environment description",
            "vlan_id": 199,
        })
        assert patch_resp.status_code == 200
        assert patch_resp.json()["vlan_id"] == 199
        assert patch_resp.json()["description"] == "Updated staging environment description"

        # 8. Query Subnet IP Allocation Map
        ip_map_resp = await client.get(f"/api/v1/ipam/subnets/{subnet_id}/ips?limit=10")
        assert ip_map_resp.status_code == 200
        ips = ip_map_resp.json()
        assert len(ips) == 10
        # First host address should be the gateway 10.99.10.1
        gw_item = next((item for item in ips if item["ip"] == "10.99.10.1"), None)
        assert gw_item is not None
        assert gw_item["status"] == "gateway"
        assert gw_item["is_gateway"] is True

        # Second address should be available
        avail_item = next((item for item in ips if item["ip"] == "10.99.10.2"), None)
        assert avail_item is not None
        assert avail_item["status"] == "available"

        # 9. Clean up created test subnet
        del_resp = await client.delete(f"/api/v1/ipam/subnets/{subnet_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "success"
