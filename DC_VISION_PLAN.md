# DC VISION — Scope, Architecture & Implementation Roadmap

> **เป้าหมายของระบบ:** NOC / System Engineer Operations Portal สำหรับติดตามสถานะ Monitoring และจัดการตำแหน่งอุปกรณ์ภายใน Data Center โดยใช้ Zabbix เป็นแหล่งข้อมูล Monitoring หลัก และใช้ DC VISION (PostgreSQL) เป็นแหล่งข้อมูลทางกายภาพ (Rack/Floor Plan)
> 
> **หลักการสำคัญ:** ทำฟีเจอร์เดิมให้เชื่อถือได้ 100% ก่อนเพิ่มฟีเจอร์ใหม่ ไม่รื้อสถาปัตยกรรมเดิม (FastAPI + React + PostgreSQL + Redis) และไม่สร้างข้อมูล Monitoring/IP ซ้ำซ้อนกับ Zabbix

---

## 1. ข้อมูลยืนยันจากระบบจริง (Live Environment Baseline)

- **Zabbix JSON-RPC Endpoint:** `http://192.168.1.85:8080/api_jsonrpc.php`
- **Zabbix Web Console:** `http://192.168.1.85:8080/`
- **Zabbix Server Version:** `7.0.29` (ตรวจสอบยืนยันผ่าน API จริง)
- **จำนวน Host ที่ Monitor อยู่จริง:** `30 Monitored Hosts` (Network Switches, Firewalls, Storage arrays, Servers, Docker containers)
- **Tech Stack:**
  - Backend: FastAPI, SQLAlchemy, PostgreSQL, Redis, httpx
  - Frontend: React 18, TypeScript, TailwindCSS, Zustand, Lucide Icons

---

## 2. การแบ่งหน้าที่ของแต่ละระบบ (Responsibility Matrix)

| ข้อมูล / ความสามารถ | แหล่งข้อมูลหลัก | หน้าที่ของ DC VISION |
| :--- | :--- | :--- |
| **Host identity, สถานะ, Uptime** | Zabbix | ดึงมาแสดงผล และจับคู่กับอุปกรณ์ในตู้ |
| **Problems & Severity** | Zabbix | สรุปปัญหาบน Overview และแสดงรายละเอียดใน Host Card |
| **CPU, Memory, Temp, Metrics** | Zabbix | อ่านจาก Item Key จริง (ไม่มีการสุ่มหรือเดา) |
| **IP Address** | Zabbix | อ่านและแสดงผลเท่านั้น (ไม่สร้างระบบจัดสรร IP) |
| **Host Groups & Tags** | Zabbix | ดึงมาใช้ค้นหา และจัดหมวดหมู่อุปกรณ์ |
| **Site, Building, Room, Row, Rack** | DC VISION (PostgreSQL) | จัดการตำแหน่งทางกายภาพ และ Floor Plan 2D |
| **U Position (1-42U), Rack Face** | DC VISION (PostgreSQL) | แสดงผล Rack Elevation และตรวจจับ U ซ้อนทับ (Collision) |
| **การเชื่อมโยง Host กับอุปกรณ์** | `zabbix_hostid` | ใช้เป็น Foreign Key เชื่อมระหว่าง Zabbix กับ Database |
| **สถานะการเชื่อมต่อ** | Redis / Poller | รายงานสถานะ Connected, Stale, Disconnected |

---

## 3. สถาปัตยกรรมข้อมูลและการไหลของระบบ (Data Flow & Architecture)

```
                       ┌──────────────────────────┐
                       │      Zabbix Server       │
                       │   7.0.29 @ 192.168.1.85  │
                       └────────────┬─────────────┘
                                    │ JSON-RPC (Bearer Token)
                       ┌────────────▼─────────────┐
                       │      zabbix_service      │
                       └────────────┬─────────────┘
                                    │
                       ┌────────────▼─────────────┐
                       │     Redis Cache Layer    │
                       │  - hosts_summaries       │
                       │  - active_problems       │
                       │  - zabbix_sync_status    │
                       └────────────┬─────────────┘
                                    │
             ┌──────────────────────┴──────────────────────┐
             │                                             │
┌────────────▼────────────┐                   ┌────────────▼────────────┐
│   PostgreSQL (DCIM)     │                   │     FastAPI Routers     │
│ - sites, rooms, racks   │                   │ - /api/v1/overview      │
│ - devices (zabbix_hostid│                   │ - /api/v1/devices       │
│ - collision validation  │                   │ - /api/v1/zabbix        │
└─────────────────────────┘                   └────────────┬────────────┘
                                                           │ HTTP REST (Single round-trip)
                                              ┌────────────▼────────────┐
                                              │    React Operations     │
                                              │ - Operations Overview   │
                                              │ - Active Alerts         │
                                              │ - Rack Elevation 42U    │
                                              │ - Unassigned Inbox      │
                                              └─────────────────────────┘
```

### Backend-First Guarantees
1. **No N+1 API Calls:** Frontend จะไม่ยิงขอข้อมูล Host ทีละเครื่อง หน้า Overview และ Racks จะได้รับข้อมูลสรุปครบในรอบเดียวจาก Backend
2. **Cache Protection:** การเข้าถึงข้อมูล Zabbix จะผ่าน Background Poller และพักใน Redis เพื่อไม่ให้ Zabbix Server รับภาระหนักจากการเปิดหน้าเว็บของผู้ใช้
3. **Graceful Degradation:** แม้ Zabbix จะมีปัญหาหรือปิดปรับปรุง ข้อมูลตำแหน่งตู้และ Rack Elevation ใน PostgreSQL จะต้องเปิดดูได้ตามปกติ ไม่ล่มตาม Zabbix

---

## 4. มาตรฐานสถานะข้อมูล (Data State Specification)

เมื่อ Zabbix ขาดการติดต่อหรือตอบสนองช้า Portal จะปฏิบัติตามมาตรฐานสถานะดังนี้:

| สถานะ | เงื่อนไข | พฤติกรรมของ Portal |
| :--- | :--- | :--- |
| **`CONNECTED`** | Sync ล่าสุดสำเร็จภายในช่วงเวลาปกติ (<= 120 วินาที) | แสดงจุดสถานะสีเขียว พร้อมระบุเวลา "Last Sync: HH:MM:SS" ข้อมูลสดใหม่ |
| **`STALE`** | Sync ล้มเหลวชั่วคราว แต่ข้อมูลใน Redis ยังไม่เกิน TTL (120 - 600 วินาที) | แสดงจุดสีส้ม/เหลือง แจ้งเตือน "STALE DATA (Sync ล่าสุดเมื่อ HH:MM:SS)" แสดงข้อมูลเดิมจาก Cache เพื่อให้ทำงานต่อได้ |
| **`DISCONNECTED`** | ติดต่อ Zabbix ไม่ได้เกิน 10 นาที หรือ Redis ไม่มี Cache | แสดงจุดสีแดง "Zabbix Disconnected" ในส่วน Metrics/Problems ให้แสดง "Data Unavailable" **ห้ามใส่ข้อมูล Mock มาแทนที่** ส่วนตำแหน่ง Rack ใน PostgreSQL ยังดูได้ปกติ |
| **`ERROR`** | Zabbix API ตอบกลับด้วย Error Code | บันทึก Log และแสดงข้อความแจ้งเตือนที่เข้าใจง่าย |

---

## 5. การจัดกลุ่มฟีเจอร์ (Feature Scope Classification)

### กลุ่ม A — ฟีเจอร์หลักที่ต้องใช้งานได้จริง (Core Scope)
- **Operations Overview:** จำนวน Host, ปัญหาแยกตาม Severity, สถานะการเชื่อมต่อ Zabbix และการใช้พื้นที่ Rack
- **Alerts / Problems:** รายการปัญหาแบบเรียลไทม์ พร้อมปุ่มเปิดไปยัง Host บน Zabbix โดยตรง
- **Device Inventory:** ค้นหา Host ด้วยชื่อ, IP, Group, Tag และดู Hardware Spec
- **Unassigned Hosts Inbox:** แสดง Host ที่ Zabbix ค้นพบแต่ยังไม่ได้ลงตู้ พร้อมระบบ 1-Click Mount
- **Rack Elevation 42U:** แสดงอุปกรณ์ในตู้แบบ Front และ Rear View
- **Collision Detection:** ป้องกันการติดตั้งอุปกรณ์ในตำแหน่ง U ที่ซ้ำซ้อน
- **2D Floor Plan:** แสดงตำแหน่งห้อง แถว และตู้แร็ค
- **Global Search (Ctrl+K):** ค้นหา Host, Device และ Rack จากข้อมูลจริง

### กลุ่ม B — เก็บโค้ดไว้ แต่ปรับให้เรียบง่าย (Simplified)
- **IPAM:** ซ่อนระบบ Provisioning Subnet เปลี่ยนเป็นตารางแสดง IP จริงที่อ่านจาก Zabbix
- **Reports:** สรุปสถิติตามข้อมูลจริง (ตัดการคำนวณจำลองออก)
- **Mount / Decommission:** คง Workflow เดิม และส่ง Maintenance Suppression ไปยัง Zabbix
- **Device Models:** เก็บตารางแม่แบบเพื่อระบุความสูง U และข้อมูลทางกายภาพ

### กลุ่ม C — พักไว้ก่อน (Deferred - ซ่อน UI ยังไม่ลบโค้ด)
- 3D Digital Twin เต็มรูปแบบ (ใช้ 2D Floor Plan และ Rack Elevation เป็นหลัก)
- Power, Temperature และ PUE ที่สร้างจาก Sine-wave จำลอง
- AI Copilot ที่ใช้การสุ่มค่า Embedding
- Blast Radius จากสายเคเบิลจำลอง
- IP Allocation Grid และการจัดการ VLAN Provisioning

---

## 6. แผนงานพัฒนาตามลำดับ Checkpoint (Implementation Roadmap)

```
[Phase 0: Security & Baseline] (เสร็จสมบูรณ์ 100%)
  ├── [x] Task 0.1: ตรวจและจัดระเบียบ Secrets / Config (เสร็จสิ้น)
  ├── [x] Task 0.2: แก้ไข Baseline Tests 8 รายการให้ผ่าน 100% (เสร็จสิ้น)
  ├── [x] Task 0.3: วางขอบเขต Backend Authentication (ไม่ทำ JWT, เปิด /health) (เสร็จสิ้น)
  └── [x] Task 0.4: ปิด Silent Mock Fallbacks และแยก Seeder ออกจาก Production (เสร็จสิ้น)

[Phase 1: Reliable Zabbix Integration]
  ├── [x] Task 1.1: ปรับปรุง Zabbix Client เชื่อมต่อ 7.0.29 จริง พร้อมสถานะ Connected/Stale/Disconnected (เสร็จสิ้น)
  ├── [ ] Task 1.2: ตรวจสอบและแก้ไข Item Key Matching สำหรับ CPU/Memory ตามมาตรฐาน Zabbix จริง ◄ (ขั้นตอนถัดไป)
  └── [ ] Task 1.3: ปรับปรุง Unassigned Hosts Reconciliation (เทียบ Zabbix vs PostgreSQL จริง)

[Phase 2: Rack Operations Workflow]
  ├── Task 2.1: ทดสอบและเสริมความแข็งแกร่งของ Rack Collision Detection & Mount Flow
  ├── Task 2.2: ทำ Deep Links จาก Portal ไปยัง Zabbix Web Console (Host & Problem)
  └── Task 2.3: ปรับ Navigation และ Sidebar เพื่อซ่อนฟังก์ชันที่พักไว้

[Phase 3: Operational Refinements]
  ├── Task 3.1: ปรับปรุงหน้า Reports ให้สรุปข้อมูลจริง
  └── Task 3.2: เพิ่มการแจ้งเตือนเมื่อการเชื่อมต่อ Zabbix ผิดปกติ
```

---

## 7. รายละเอียดเฉพาะ Task 0.1: การจัดการ Secrets & Config

### ไฟล์ที่เกี่ยวข้อง
1. `backend/app/config.py`
2. `.env.example`
3. `.env.production.example`
4. `docker-compose.yml`
5. `docker-compose.prod.yml`

### สิ่งที่ตรวจพบ (จุดเสี่ยง)
- มี Token จริง `9f14f8772b0ddb6d29ebab9f809201c030b3051d3d7f8639ddd4c6fba92c3808` ฝังอยู่ใน `config.py`, `.env.example`, `.env.production.example` และ `docker-compose.yml`
- มีรหัสผ่านฐานข้อมูล `nexustwin_secret` เป็น fallback ใน `config.py` และ `docker-compose.yml`

### แผนการเปลี่ยนแปลงเมื่อได้รับอนุมัติ
1. ลบ Default Token และ Password ออกจาก `backend/app/config.py` ให้เป็นสตริงว่าง `""` เพื่อบังคับให้อ่านจาก `.env` เท่านั้น
2. แทนที่ Token และ Password ใน `.env.example` และ `.env.production.example` ด้วย Placeholder เช่น `your_zabbix_api_token_here`
3. ลบ Default Fallback ใน `docker-compose.yml` และ `docker-compose.prod.yml` ให้ใช้เฉพาะ `${ZABBIX_API_TOKEN}` และ `${POSTGRES_PASSWORD}`
4. เพิ่มตัวแปร `ZABBIX_WEB_URL=http://192.168.1.85:8080`, `ZABBIX_STALE_THRESHOLD_SECONDS=120`, และ `ZABBIX_DISCONNECTED_THRESHOLD_SECONDS=600`
5. ยืนยันว่าไฟล์ `backend/.env` ในเครื่องมีค่าจริงครบถ้วน เพื่อให้ระบบทำงานได้ทันที

### การทดสอบยืนยัน (Terminal Verification)
- คำสั่ง: `git grep "9f14f8772b0ddb6d29ebab9f809201c030b3051d3d7f8639ddd4c6fba92c3808"` ต้องไม่พบใน Tracked Files
- คำสั่ง: `.\venv\Scripts\python.exe -c "from backend.app.config import settings; print('Config loaded successfully')"` ต้องรันผ่านโดยไม่มี Error
- คำสั่ง: `.\venv\Scripts\pytest.exe backend/tests/test_health.py` ต้องได้ Exit code 0
