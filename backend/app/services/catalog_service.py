from typing import Any, Dict, List, Optional
from backend.app.schemas import DeviceTemplate, BrandInfo
from backend.app.services.brand_service import resolve_brand_metadata


HARDWARE_TEMPLATES: List[Dict[str, Any]] = [
    # ── Dell EMC ──────────────────────────────────────────────────────────
    {
        "id": "dell-poweredge-r750",
        "brand": "Dell",
        "manufacturer": "Dell EMC",
        "model": "PowerEdge R750",
        "device_type": "Server",
        "height_u": 2,
        "description": "2U Enterprise Rack Server, Dual 3rd Gen Intel Xeon, 24x 2.5\" Bays",
    },
    {
        "id": "dell-poweredge-r650",
        "brand": "Dell",
        "manufacturer": "Dell EMC",
        "model": "PowerEdge R650",
        "device_type": "Server",
        "height_u": 1,
        "description": "1U High-Density Rack Server, Dual Intel Xeon Scalable",
    },
    {
        "id": "dell-powerstore-5000t",
        "brand": "Dell",
        "manufacturer": "Dell EMC",
        "model": "PowerStore 5000T",
        "device_type": "Storage",
        "height_u": 2,
        "description": "2U All-Flash NVMe Unified Storage Array",
    },

    # ── HPE ──────────────────────────────────────────────────────────────
    {
        "id": "hpe-proliant-dl380-gen10",
        "brand": "HPE",
        "manufacturer": "HPE",
        "model": "ProLiant DL380 Gen10",
        "device_type": "Server",
        "height_u": 2,
        "description": "2U Flagship Enterprise Server, Dual Xeon, iLO 5 Management",
    },
    {
        "id": "hpe-proliant-dl360-gen10",
        "brand": "HPE",
        "manufacturer": "HPE",
        "model": "ProLiant DL360 Gen10",
        "device_type": "Server",
        "height_u": 1,
        "description": "1U Compute-Dense Enterprise Dual-Socket Server",
    },
    {
        "id": "hpe-apollo-4200",
        "brand": "HPE",
        "manufacturer": "HPE",
        "model": "Apollo 4200 Gen10",
        "device_type": "Storage",
        "height_u": 2,
        "description": "2U Storage-Optimized Server with Deep LFF Drive Capacity",
    },

    # ── Cisco ────────────────────────────────────────────────────────────
    {
        "id": "cisco-catalyst-9300-48p",
        "brand": "Cisco",
        "manufacturer": "Cisco",
        "model": "Catalyst 9300-48P",
        "device_type": "Switch",
        "height_u": 1,
        "description": "48-Port PoE+ Gigabit Access Switch, Modular Uplinks & StackWise",
    },
    {
        "id": "cisco-nexus-9336c-fx2",
        "brand": "Cisco",
        "manufacturer": "Cisco",
        "model": "Nexus 9336C-FX2",
        "device_type": "Switch",
        "height_u": 1,
        "description": "36-Port 40/100G QSFP28 Spine/Leaf Data Center Switch",
    },
    {
        "id": "cisco-ucs-c220-m5",
        "brand": "Cisco",
        "manufacturer": "Cisco",
        "model": "UCS C220 M5",
        "device_type": "Server",
        "height_u": 1,
        "description": "1U Dual-Socket Rack Server for High-Density Compute & Virtualization",
    },

    # ── Huawei ───────────────────────────────────────────────────────────
    {
        "id": "huawei-cloudengine-6885",
        "brand": "Huawei",
        "manufacturer": "Huawei",
        "model": "CloudEngine 6885-48Y8C",
        "device_type": "Switch",
        "height_u": 2,
        "description": "48x 25GE SFP28 + 8x 100GE QSFP28 Data Center Leaf Switch",
    },
    {
        "id": "huawei-oceanstor-dorado-3000",
        "brand": "Huawei",
        "manufacturer": "Huawei",
        "model": "OceanStor Dorado 3000",
        "device_type": "Storage",
        "height_u": 2,
        "description": "2U NVMe All-Flash Enterprise SAN/NAS Storage",
    },
    {
        "id": "huawei-netengine-8000-f1a",
        "brand": "Huawei",
        "manufacturer": "Huawei",
        "model": "NetEngine 8000 F1A",
        "device_type": "Switch",
        "height_u": 1,
        "description": "1U High-Capacity Edge Router & Carrier Multi-Service Gateway",
    },

    # ── Fortinet ─────────────────────────────────────────────────────────
    {
        "id": "fortinet-fortigate-701g",
        "brand": "Fortinet",
        "manufacturer": "Fortinet",
        "model": "FortiGate 701G",
        "device_type": "Firewall",
        "height_u": 2,
        "description": "2U Enterprise Next-Gen Firewall, Ultra-High SSL/TLS Inspection",
    },
    {
        "id": "fortinet-fortigate-200f",
        "brand": "Fortinet",
        "manufacturer": "Fortinet",
        "model": "FortiGate 200F",
        "device_type": "Firewall",
        "height_u": 1,
        "description": "1U Mid-Enterprise Security Gateway with Dedicated SP5 NPU",
    },
    {
        "id": "fortinet-fortigate-100f",
        "brand": "Fortinet",
        "manufacturer": "Fortinet",
        "model": "FortiGate 100F",
        "device_type": "Firewall",
        "height_u": 1,
        "description": "1U Enterprise Branch Next-Gen Firewall with Dual 10GE SFP+",
    },

    # ── Palo Alto Networks ───────────────────────────────────────────────
    {
        "id": "palo-alto-pa-3220",
        "brand": "Palo Alto",
        "manufacturer": "Palo Alto Networks",
        "model": "PA-3220",
        "device_type": "Firewall",
        "height_u": 2,
        "description": "2U High-Performance Data Center Threat Prevention Gateway",
    },
    {
        "id": "palo-alto-pa-440",
        "brand": "Palo Alto",
        "manufacturer": "Palo Alto Networks",
        "model": "PA-440",
        "device_type": "Firewall",
        "height_u": 1,
        "description": "1U Perimeter ML-Powered NGFW with Multi-Gigabit Ports",
    },
    {
        "id": "palo-alto-pa-5250",
        "brand": "Palo Alto",
        "manufacturer": "Palo Alto Networks",
        "model": "PA-5250",
        "device_type": "Firewall",
        "height_u": 3,
        "description": "3U Enterprise Data Center & Carrier High-Throughput NGFW",
    },

    # ── Supermicro ───────────────────────────────────────────────────────
    {
        "id": "supermicro-superserver-6029p",
        "brand": "Supermicro",
        "manufacturer": "Supermicro",
        "model": "SuperServer 6029P-WTR",
        "device_type": "Server",
        "height_u": 2,
        "description": "2U Dual Intel Xeon Scalable Server with 12x 3.5\" Hot-Swap Bays",
    },
    {
        "id": "supermicro-superserver-1029p",
        "brand": "Supermicro",
        "manufacturer": "Supermicro",
        "model": "SuperServer 1029P-WTR",
        "device_type": "Server",
        "height_u": 1,
        "description": "1U High-Density Dual-Processor Enterprise Server",
    },

    # ── APC by Schneider Electric ────────────────────────────────────────
    {
        "id": "apc-smart-ups-rt-10kva",
        "brand": "APC",
        "manufacturer": "APC by Schneider Electric",
        "model": "Smart-UPS RT 10kVA",
        "device_type": "UPS",
        "height_u": 4,
        "description": "4U On-Line Double-Conversion Power Protection & External Battery",
    },
    {
        "id": "apc-smart-ups-3kva",
        "brand": "APC",
        "manufacturer": "APC by Schneider Electric",
        "model": "Smart-UPS 3kVA RM",
        "device_type": "UPS",
        "height_u": 2,
        "description": "2U Rackmount Enterprise Pure Sine-Wave Backup Power",
    },

    # ── Infrastructure & Generic ─────────────────────────────────────────
    {
        "id": "generic-patch-panel-24p",
        "brand": "Generic",
        "manufacturer": "Standard",
        "model": "Cat6A 24-Port Patch Panel",
        "device_type": "Patch Panel",
        "height_u": 1,
        "description": "1U 24-Port Cat6A Keystone Shielded Copper Patch Panel",
    },
    {
        "id": "generic-blank-panel-1u",
        "brand": "Generic",
        "manufacturer": "Standard",
        "model": "1U Blanking Panel",
        "device_type": "Blank Panel",
        "height_u": 1,
        "description": "1U Matte Black Airflow Management Blanking Filler Panel",
    },
    {
        "id": "generic-blank-panel-2u",
        "brand": "Generic",
        "manufacturer": "Standard",
        "model": "2U Blanking Panel",
        "device_type": "Blank Panel",
        "height_u": 2,
        "description": "2U Matte Black Airflow Management Blanking Filler Panel",
    },
]


def get_hardware_templates(
    brand: Optional[str] = None,
    category: Optional[str] = None,
) -> List[DeviceTemplate]:
    """
    Retrieve list of pre-configured enterprise hardware models.
    Enriches each template with BrandInfo (badge colors, logos, accents)
    for seamless 1-click mounting in MountDeviceModal.
    """
    results: List[DeviceTemplate] = []

    for item in HARDWARE_TEMPLATES:
        # Filter by brand if specified
        if brand and brand.lower() not in ["all", ""]:
            if item["brand"].lower() != brand.lower():
                continue

        # Filter by category if specified
        if category and category.lower() not in ["all", ""]:
            if item["device_type"].lower() != category.lower():
                continue

        # Resolve brand visual metadata
        b_meta = resolve_brand_metadata(
            model=item["model"],
            manufacturer=item["manufacturer"],
            name=item["model"],
        )

        brand_info = BrandInfo(**b_meta) if b_meta else None

        results.append(
            DeviceTemplate(
                id=item["id"],
                brand=item["brand"],
                manufacturer=item["manufacturer"],
                model=item["model"],
                device_type=item["device_type"],
                height_u=item["height_u"],
                description=item.get("description"),
                brand_info=brand_info,
            )
        )

    return results
