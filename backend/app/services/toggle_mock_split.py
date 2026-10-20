import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(root_dir))

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from backend.app.services.zabbix_service import zabbix_service

GREEN_HOSTS = {
    "DC1-CORE-SW-01",
    "DC1-DIST-SW-01",
    "DC1-EDGE-FW-01",
    "DC1-SAN-STOR-01",
    "DC1-UPS-RACK-A",
    "DC1-SRV-K8S-M01",
    "DC1-SRV-K8S-W01",
    "DC1-SRV-PGSQL-01",
}

RED_HOSTS_DEFAULT_IPS = {
    "DC1-CORE-SW-02": "10.220.10.2",
    "DC1-DIST-SW-02": "10.220.10.12",
    "DC1-EDGE-FW-02": "10.220.20.2",
    "DC1-UPS-RACK-B": "10.220.40.2",
    "DC1-SRV-K8S-W02": "10.220.50.22",
    "DC1-SRV-PGSQL-02": "10.220.50.32",
    "DC1-SRV-WIN-AD01": "10.220.50.41",
    "DC1-SRV-LOG-ELK01": "10.220.50.51",
}

SIMULATOR_IP = "192.168.1.85"

async def apply_split():
    print(f"Connecting to Zabbix API at {zabbix_service.url}...")
    
    hosts = await zabbix_service._call("host.get", {
        "output": ["hostid", "host", "name"],
        "selectInterfaces": ["interfaceid", "type", "ip", "port", "available"],
        "filter": {
            "host": list(GREEN_HOSTS.union(RED_HOSTS_DEFAULT_IPS.keys()))
        }
    })
    
    print(f"Target DC1 hosts found: {len(hosts)}")
    
    updated_count = 0
    for h in hosts:
        host_code = h["host"]
        if not h.get("interfaces"):
            continue
            
        interface = h["interfaces"][0]
        current_ip = interface["ip"]
        target_ip = SIMULATOR_IP if host_code in GREEN_HOSTS else RED_HOSTS_DEFAULT_IPS.get(host_code, current_ip)
        
        status_text = "🟢 GREEN" if host_code in GREEN_HOSTS else "🔴 RED"
        if current_ip != target_ip:
            print(f"Updating {host_code}: {current_ip} -> {target_ip} ({status_text})")
            res = await zabbix_service._call("hostinterface.update", {
                "interfaceid": interface["interfaceid"],
                "ip": target_ip
            })
            updated_count += 1
        else:
            print(f"Already configured: {host_code} -> {current_ip} ({status_text})")
            
    print(f"\nDone! Updated {updated_count} interfaces.")

if __name__ == "__main__":
    asyncio.run(apply_split())
