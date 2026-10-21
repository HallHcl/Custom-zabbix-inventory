from typing import Any, Dict, Optional
import re


BRAND_PRESETS = {
    "cisco": {
        "name": "Cisco",
        "tag": "CISCO",
        "color": "#00bceb",
        "bg_color": "#0c2838",
        "badge_class": "bg-cyan-950/80 border-cyan-600/80 text-cyan-300",
        "glow_color": "rgba(0, 188, 235, 0.4)",
    },
    "huawei": {
        "name": "Huawei",
        "tag": "HUAWEI",
        "color": "#cf0a2c",
        "bg_color": "#331218",
        "badge_class": "bg-rose-950/80 border-rose-600/80 text-rose-300",
        "glow_color": "rgba(207, 10, 44, 0.4)",
    },
    "dell": {
        "name": "Dell",
        "tag": "DELL EMC",
        "color": "#007db8",
        "bg_color": "#0b253a",
        "badge_class": "bg-blue-950/80 border-blue-600/80 text-blue-300",
        "glow_color": "rgba(0, 125, 184, 0.4)",
    },
    "hpe": {
        "name": "HPE",
        "tag": "HPE",
        "color": "#01a982",
        "bg_color": "#0d2b24",
        "badge_class": "bg-emerald-950/80 border-emerald-600/80 text-emerald-300",
        "glow_color": "rgba(1, 169, 130, 0.4)",
    },
    "fortinet": {
        "name": "Fortinet",
        "tag": "FORTINET",
        "color": "#ee3124",
        "bg_color": "#361614",
        "badge_class": "bg-red-950/80 border-red-600/80 text-red-300",
        "glow_color": "rgba(238, 49, 36, 0.4)",
    },
    "palo alto": {
        "name": "Palo Alto",
        "tag": "PALO ALTO",
        "color": "#fa582d",
        "bg_color": "#3b1e15",
        "badge_class": "bg-amber-950/80 border-amber-600/80 text-amber-300",
        "glow_color": "rgba(250, 88, 45, 0.4)",
    },
    "supermicro": {
        "name": "Supermicro",
        "tag": "SUPERMICRO",
        "color": "#006699",
        "bg_color": "#0e2333",
        "badge_class": "bg-indigo-950/80 border-indigo-600/80 text-indigo-300",
        "glow_color": "rgba(0, 102, 153, 0.4)",
    },
    "apc": {
        "name": "APC",
        "tag": "APC",
        "color": "#00873d",
        "bg_color": "#0e291b",
        "badge_class": "bg-teal-950/80 border-teal-600/80 text-teal-300",
        "glow_color": "rgba(0, 135, 61, 0.4)",
    },
}


def extract_model_family(model_str: Optional[str]) -> Optional[str]:
    """Extract clean, short model family for high-density rack display"""
    if not model_str:
        return None
    s = model_str.strip()
    # Match common model patterns
    patterns = [
        r"(CloudEngine\s*\d+)",
        r"(OceanStor\s*\d+)",
        r"(NetEngine\s*\d+)",
        r"(Catalyst\s*\d+)",
        r"(Nexus\s*\d+[A-Za-z]*)",
        r"(UCS\s*[A-Za-z0-9]+(?:\s*M\d+)?)",
        r"(PowerEdge\s*[A-Za-z0-9]+)",
        r"(PowerStore\s*[A-Za-z0-9]+)",
        r"(PowerVault\s*[A-Za-z0-9]+)",
        r"(ProLiant\s*[A-Za-z0-9]+(?:\s*Gen\d+)?)",
        r"(Apollo\s*[A-Za-z0-9]+)",
        r"(Alletra\s*[A-Za-z0-9]+)",
        r"(FortiGate\s*[A-Za-z0-9]+)",
        r"(PA-\d+)",
        r"(SuperServer\s*[A-Za-z0-9-]+)",
        r"(FatTwin\s*[A-Za-z0-9-]+)",
        r"(Smart-UPS\s*[A-Za-z0-9\s]+)",
        r"(Symmetra\s*[A-Za-z0-9\s]+)",
    ]
    for p in patterns:
        m = re.search(p, s, re.IGNORECASE)
        if m:
            return m.group(1).strip()

    # Fallback to first 2-3 words
    words = s.split()
    if len(words) <= 3:
        return s
    return " ".join(words[:2])


def resolve_brand_info(
    model: Optional[str] = None,
    manufacturer: Optional[str] = None,
    name: Optional[str] = None,
    tags: Optional[Dict[str, Any]] = None,
    custom_fields: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """
    Resolve and normalize brand metadata, color tokens, and model family.
    """
    corpus = " ".join(
        filter(
            None,
            [
                manufacturer,
                model,
                name,
                str(tags.get("Brand") if tags else ""),
                str(custom_fields.get("brand") if custom_fields else ""),
                str(custom_fields.get("vendor") if custom_fields else ""),
            ],
        )
    ).lower()

    matched_key = None
    if "cisco" in corpus or "catalyst" in corpus or "nexus" in corpus or "ucs " in corpus:
        matched_key = "cisco"
    elif "huawei" in corpus or "cloudengine" in corpus or "oceanstor" in corpus or "netengine" in corpus:
        matched_key = "huawei"
    elif "dell" in corpus or "poweredge" in corpus or "powerstore" in corpus or "powervault" in corpus:
        matched_key = "dell"
    elif "hpe" in corpus or "proliant" in corpus or "dl380" in corpus or "dl360" in corpus or "hewlett" in corpus or "apollo" in corpus or "alletra" in corpus:
        matched_key = "hpe"
    elif "fortinet" in corpus or "fortigate" in corpus:
        matched_key = "fortinet"
    elif "palo alto" in corpus or "pan-os" in corpus or "pa-440" in corpus or "pa-3200" in corpus or "pa-" in corpus:
        matched_key = "palo alto"
    elif "supermicro" in corpus or "superserver" in corpus or "fattwin" in corpus:
        matched_key = "supermicro"
    elif "apc" in corpus or "schneider" in corpus or "smart-ups" in corpus or "symmetra" in corpus:
        matched_key = "apc"

    model_fam = extract_model_family(model) or model or name or "Appliance"

    if matched_key and matched_key in BRAND_PRESETS:
        preset = dict(BRAND_PRESETS[matched_key])
        preset["model_family"] = model_fam
        return preset

    # Generic Enterprise Fallback (Slate Dark Tech Theme)
    mfg = manufacturer or (name.split("-")[1] if name and "-" in name else "Enterprise")
    return {
        "name": mfg,
        "tag": mfg.upper()[:10],
        "color": "#8bd7d1",
        "bg_color": "#20282f",
        "badge_class": "bg-[#273139] border-[#50626f] text-[#caedde]",
        "glow_color": "rgba(139, 215, 209, 0.3)",
        "model_family": model_fam,
    }


def resolve_brand_metadata(
    model: Optional[str] = None,
    manufacturer: Optional[str] = None,
    name: Optional[str] = None,
    tags: Optional[Dict[str, Any]] = None,
    custom_fields: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """Public helper matching the Brand Normalizer specification."""
    return resolve_brand_info(
        model=model,
        manufacturer=manufacturer,
        name=name,
        tags=tags,
        custom_fields=custom_fields,
    )
