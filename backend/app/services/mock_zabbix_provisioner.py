import asyncio
from typing import Dict, List, Any
from backend.app.services.zabbix_service import zabbix_service

# Define 16 Mock Hosts with realistic Data Center hardware
MOCK_HOSTS: List[Dict[str, Any]] = [
    # --- Network Switches (Core & Dist) ---
    {
        "host": "DC1-CORE-SW-01",
        "name": "DC1-CORE-SW-01 (Huawei CE6885)",
        "group_id": "23",  # #Network Switch
        "template_id": "10229",  # Huawei VRP by SNMP
        "interface_type": "snmp",
        "ip": "10.220.10.1",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Huawei"},
            {"tag": "Vendor", "value": "Huawei Technologies"},
            {"tag": "Version", "value": "V200R021C00"},
            {"tag": "User", "value": "NOC-Team"},
            {"tag": "Role", "value": "Core Switch"},
            {"tag": "Location", "value": "Room A / Rack A01 / U38-U39"},
        ],
    },
    {
        "host": "DC1-CORE-SW-02",
        "name": "DC1-CORE-SW-02 (Huawei CE6885)",
        "group_id": "23",
        "template_id": "10229",
        "interface_type": "snmp",
        "ip": "10.220.10.2",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Huawei"},
            {"tag": "Vendor", "value": "Huawei Technologies"},
            {"tag": "Version", "value": "V200R021C00"},
            {"tag": "User", "value": "NOC-Team"},
            {"tag": "Role", "value": "Core Switch"},
            {"tag": "Location", "value": "Room A / Rack A02 / U38-U39"},
        ],
    },
    {
        "host": "DC1-DIST-SW-01",
        "name": "DC1-DIST-SW-01 (Cisco C9300-48P)",
        "group_id": "23",
        "template_id": "10218",  # Cisco IOS by SNMP
        "interface_type": "snmp",
        "ip": "10.220.10.11",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Cisco"},
            {"tag": "Vendor", "value": "Cisco Systems"},
            {"tag": "Version", "value": "IOS-XE 17.09.04a"},
            {"tag": "User", "value": "Network-Admin"},
            {"tag": "Role", "value": "Distribution Switch"},
            {"tag": "Location", "value": "Room A / Rack B01 / U36"},
        ],
    },
    {
        "host": "DC1-DIST-SW-02",
        "name": "DC1-DIST-SW-02 (Cisco C9300-48P)",
        "group_id": "23",
        "template_id": "10218",
        "interface_type": "snmp",
        "ip": "10.220.10.12",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Cisco"},
            {"tag": "Vendor", "value": "Cisco Systems"},
            {"tag": "Version", "value": "IOS-XE 17.09.04a"},
            {"tag": "User", "value": "Network-Admin"},
            {"tag": "Role", "value": "Distribution Switch"},
            {"tag": "Location", "value": "Room A / Rack B02 / U36"},
        ],
    },
    # --- Firewalls & Security ---
    {
        "host": "DC1-EDGE-FW-01",
        "name": "DC1-EDGE-FW-01 (Fortinet FG-701G)",
        "group_id": "24",  # Security
        "template_id": "10226",  # Network Generic Device by SNMP
        "interface_type": "snmp",
        "ip": "10.220.20.1",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Fortinet"},
            {"tag": "Vendor", "value": "Fortinet Inc."},
            {"tag": "Version", "value": "FortiOS 7.4.2"},
            {"tag": "User", "value": "SecOps-Team"},
            {"tag": "Role", "value": "NextGen Firewall"},
            {"tag": "Location", "value": "Room A / Rack A01 / U34-U35"},
        ],
    },
    {
        "host": "DC1-EDGE-FW-02",
        "name": "DC1-EDGE-FW-02 (Fortinet FG-701G)",
        "group_id": "24",
        "template_id": "10226",
        "interface_type": "snmp",
        "ip": "10.220.20.2",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Fortinet"},
            {"tag": "Vendor", "value": "Fortinet Inc."},
            {"tag": "Version", "value": "FortiOS 7.4.2"},
            {"tag": "User", "value": "SecOps-Team"},
            {"tag": "Role", "value": "NextGen Firewall"},
            {"tag": "Location", "value": "Room A / Rack A02 / U34-U35"},
        ],
    },
    # --- SAN Storage ---
    {
        "host": "DC1-SAN-STOR-01",
        "name": "DC1-SAN-STOR-01 (Dell PowerStore 5000T)",
        "group_id": "27",  # Storage
        "template_id": "10226",
        "interface_type": "snmp",
        "ip": "10.220.30.1",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "Dell"},
            {"tag": "Vendor", "value": "Dell EMC"},
            {"tag": "Version", "value": "PowerStoreOS 3.5.0.2"},
            {"tag": "User", "value": "Storage-Admin"},
            {"tag": "Role", "value": "Enterprise All-Flash SAN"},
            {"tag": "Location", "value": "Room A / Rack B03 / U14-U16"},
        ],
    },
    # --- Facility / UPS ---
    {
        "host": "DC1-UPS-RACK-A",
        "name": "DC1-UPS-RACK-A (APC Smart-UPS RT 10kVA)",
        "group_id": "24",
        "template_id": "10226",
        "interface_type": "snmp",
        "ip": "10.220.40.1",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "APC"},
            {"tag": "Vendor", "value": "Schneider Electric"},
            {"tag": "Version", "value": "NMC3 v4.2.1"},
            {"tag": "User", "value": "Facility-Team"},
            {"tag": "Role", "value": "Online UPS 10kVA"},
            {"tag": "Location", "value": "Room A / Rack A01 / U01-U04"},
        ],
    },
    {
        "host": "DC1-UPS-RACK-B",
        "name": "DC1-UPS-RACK-B (APC Smart-UPS RT 10kVA)",
        "group_id": "24",
        "template_id": "10226",
        "interface_type": "snmp",
        "ip": "10.220.40.2",
        "port": "161",
        "tags": [
            {"tag": "Brand", "value": "APC"},
            {"tag": "Vendor", "value": "Schneider Electric"},
            {"tag": "Version", "value": "NMC3 v4.2.1"},
            {"tag": "User", "value": "Facility-Team"},
            {"tag": "Role", "value": "Online UPS 10kVA"},
            {"tag": "Location", "value": "Room A / Rack B01 / U01-U04"},
        ],
    },
    # --- Linux Agent Servers (Kubernetes Cluster) ---
    {
        "host": "DC1-SRV-K8S-M01",
        "name": "DC1-SRV-K8S-M01 (Dell R750 Master)",
        "group_id": "2",  # Linux servers
        "template_id": "10001",  # Linux by Zabbix agent
        "interface_type": "agent",
        "ip": "10.220.50.11",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "Dell"},
            {"tag": "Vendor", "value": "RedHat / Dell EMC"},
            {"tag": "Version", "value": "RHEL 9.3 (Linux 5.14)"},
            {"tag": "User", "value": "DevOps-Lead"},
            {"tag": "Role", "value": "K8s Master Node 01"},
            {"tag": "Location", "value": "Room A / Rack B03 / U26-U27"},
        ],
    },
    {
        "host": "DC1-SRV-K8S-W01",
        "name": "DC1-SRV-K8S-W01 (Dell R750 Worker 1)",
        "group_id": "2",
        "template_id": "10001",
        "interface_type": "agent",
        "ip": "10.220.50.21",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "Dell"},
            {"tag": "Vendor", "value": "Canonical / Dell EMC"},
            {"tag": "Version", "value": "Ubuntu 24.04 LTS"},
            {"tag": "User", "value": "DevOps-Team"},
            {"tag": "Role", "value": "K8s Worker Node 01"},
            {"tag": "Location", "value": "Room A / Rack B03 / U24-U25"},
        ],
    },
    {
        "host": "DC1-SRV-K8S-W02",
        "name": "DC1-SRV-K8S-W02 (Dell R750 Worker 2)",
        "group_id": "2",
        "template_id": "10001",
        "interface_type": "agent",
        "ip": "10.220.50.22",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "Dell"},
            {"tag": "Vendor", "value": "Canonical / Dell EMC"},
            {"tag": "Version", "value": "Ubuntu 24.04 LTS"},
            {"tag": "User", "value": "DevOps-Team"},
            {"tag": "Role", "value": "K8s Worker Node 02"},
            {"tag": "Location", "value": "Room A / Rack B03 / U22-U23"},
        ],
    },
    # --- Database Servers (PostgreSQL) ---
    {
        "host": "DC1-SRV-PGSQL-01",
        "name": "DC1-SRV-PGSQL-01 (HPE DL380 Primary)",
        "group_id": "26",  # Server
        "template_id": "10001",
        "interface_type": "agent",
        "ip": "10.220.50.31",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "HPE"},
            {"tag": "Vendor", "value": "Hewlett Packard Enterprise"},
            {"tag": "Version", "value": "PostgreSQL 16.2 on RHEL 9"},
            {"tag": "User", "value": "DBA-Team"},
            {"tag": "Role", "value": "Primary Database"},
            {"tag": "Location", "value": "Room A / Rack B03 / U18-U19"},
        ],
    },
    {
        "host": "DC1-SRV-PGSQL-02",
        "name": "DC1-SRV-PGSQL-02 (HPE DL380 Standby)",
        "group_id": "26",
        "template_id": "10001",
        "interface_type": "agent",
        "ip": "10.220.50.32",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "HPE"},
            {"tag": "Vendor", "value": "Hewlett Packard Enterprise"},
            {"tag": "Version", "value": "PostgreSQL 16.2 on RHEL 9"},
            {"tag": "User", "value": "DBA-Team"},
            {"tag": "Role", "value": "Standby Database"},
            {"tag": "Location", "value": "Room A / Rack B04 / U18-U19"},
        ],
    },
    # --- Windows Server (Active Directory) ---
    {
        "host": "DC1-SRV-WIN-AD01",
        "name": "DC1-SRV-WIN-AD01 (Cisco UCS C220 AD)",
        "group_id": "26",
        "template_id": "10081",  # Windows by Zabbix agent
        "interface_type": "agent",
        "ip": "10.220.50.41",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "Cisco"},
            {"tag": "Vendor", "value": "Microsoft Corporation"},
            {"tag": "Version", "value": "Windows Server 2022 Datacenter"},
            {"tag": "User", "value": "IT-Support"},
            {"tag": "Role", "value": "Active Directory Domain Controller"},
            {"tag": "Location", "value": "Room A / Rack B02 / U28"},
        ],
    },
    # --- Logging & Analytics ---
    {
        "host": "DC1-SRV-LOG-ELK01",
        "name": "DC1-SRV-LOG-ELK01 (Supermicro Elastic)",
        "group_id": "2",
        "template_id": "10001",
        "interface_type": "agent",
        "ip": "10.220.50.51",
        "port": "10050",
        "tags": [
            {"tag": "Brand", "value": "Supermicro"},
            {"tag": "Vendor", "value": "Super Micro Computer"},
            {"tag": "Version", "value": "Elasticsearch 8.13 / Debian 12"},
            {"tag": "User", "value": "SecOps-Team"},
            {"tag": "Role", "value": "Central SIEM & Log Analyzer"},
            {"tag": "Location", "value": "Room A / Rack B02 / U20-U21"},
        ],
    },
]


async def provision_hosts():
    print(f"[Provisioner] Checking existing hosts on Zabbix ({zabbix_service.url})...")
    host_names = [h["host"] for h in MOCK_HOSTS]
    
    existing = await zabbix_service._call("host.get", {
        "output": ["hostid", "host", "name"],
        "filter": {"host": host_names}
    })
    existing_map = {h["host"]: h["hostid"] for h in existing}
    print(f"[Provisioner] Found {len(existing_map)} already existing mock hosts.")

    created_count = 0
    updated_count = 0

    for item in MOCK_HOSTS:
        host_code = item["host"]
        host_name = item["name"]
        
        # Build interface
        if item["interface_type"] == "snmp":
            interface = {
                "type": 2,  # SNMP
                "main": 1,
                "useip": 1,
                "ip": item["ip"],
                "dns": "",
                "port": item["port"],
                "details": {
                    "version": 2,  # SNMPv2c
                    "bulk": 1,
                    "community": "public",
                },
            }
        else:
            interface = {
                "type": 1,  # Agent
                "main": 1,
                "useip": 1,
                "ip": item["ip"],
                "dns": "",
                "port": item["port"],
            }

        tags = item["tags"]

        if host_code in existing_map:
            # Update host tags & interfaces if already present
            host_id = existing_map[host_code]
            try:
                await zabbix_service._call("host.update", {
                    "hostid": host_id,
                    "name": host_name,
                    "tags": tags,
                })
                updated_count += 1
                print(f"[Provisioner] Updated existing host: {host_code} (ID: {host_id})")
            except Exception as e:
                print(f"[Provisioner] Error updating {host_code}: {e}")
        else:
            # Create new host
            payload = {
                "host": host_code,
                "name": host_name,
                "status": 0,  # 0 = Monitored
                "groups": [{"groupid": item["group_id"]}],
                "templates": [{"templateid": item["template_id"]}],
                "interfaces": [interface],
                "tags": tags,
                "inventory_mode": 0,  # Manual inventory mode
                "inventory": {
                    "vendor": next((t["value"] for t in tags if t["tag"] == "Vendor"), ""),
                    "model": next((t["value"] for t in tags if t["tag"] == "Brand"), ""),
                    "location": next((t["value"] for t in tags if t["tag"] == "Location"), ""),
                    "notes": f"Managed by DC VISION DCIM. Role: {next((t['value'] for t in tags if t['tag'] == 'Role'), '')}",
                }
            }
            try:
                res = await zabbix_service._call("host.create", payload)
                new_id = res["hostids"][0]
                existing_map[host_code] = new_id
                created_count += 1
                print(f"[Provisioner] Created host: {host_code} -> ID: {new_id}")
            except Exception as e:
                print(f"[Provisioner] Failed to create {host_code}: {e}")

    print(f"\n[Provisioner Complete] Created: {created_count}, Updated: {updated_count}, Total Managed: {len(existing_map)}")
    return existing_map


if __name__ == "__main__":
    asyncio.run(provision_hosts())
