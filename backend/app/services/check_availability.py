import asyncio
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(root_dir))

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

async def check():
    hosts = await zabbix_service._call("host.get", {
        "output": ["hostid", "host", "name"],
        "selectInterfaces": ["interfaceid", "type", "ip", "port", "available", "error"],
        "search": {"host": "DC1-"}
    })
    
    status_map = {
        "0": "⚪ UNKNOWN",
        "1": "🟢 AVAILABLE (GREEN)",
        "2": "🔴 UNAVAILABLE (RED)",
    }
    
    print(f"\n{'Host':<20} | {'Type':<5} | {'Target IP':<15} | {'Status':<25} | {'Error Details'}")
    print("-" * 85)
    
    green_count = 0
    red_count = 0
    unknown_count = 0
    
    for h in sorted(hosts, key=lambda x: x["host"]):
        ifs = h.get("interfaces", [])
        if not ifs:
            continue
        i = ifs[0]
        avail = str(i.get("available", "0"))
        type_str = "SNMP" if i.get("type") == "2" else "ZBX"
        ip = i.get("ip", "")
        err = i.get("error", "")
        
        if avail == "1":
            green_count += 1
        elif avail == "2":
            red_count += 1
        else:
            unknown_count += 1
            
        print(f"{h['host']:<20} | {type_str:<5} | {ip:<15} | {status_map.get(avail, avail):<25} | {err[:35]}")
        if avail == "2" and ip == "192.168.1.85":
            print(f"   [FULL ERROR for {h['host']}]: {err}")
        
    print("-" * 85)
    print(f"Summary: 🟢 Green={green_count}, 🔴 Red={red_count}, ⚪ Unknown={unknown_count}")

if __name__ == "__main__":
    asyncio.run(check())
