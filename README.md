# DC VISION — Custom Zabbix Inventory & DCIM

A modern Data Center Infrastructure Management (DCIM) and 42U Rack Elevation Dashboard integrated directly with **Zabbix 7.0 JSON-RPC API**, **Redis 7 (Cache)**, and **PostgreSQL 16**.

---

## 🏗️ Architecture

- **Frontend:** React 19.2 + Vite + TypeScript + Tailwind CSS (2.5D Isometric Floor Plan + 42U Interactive Rack Elevation)
- **Backend:** Python FastAPI (ASGI) + SQLAlchemy 2.0 (Asyncpg) + Pydantic v2 + HTTPX + Redis
- **Database & Cache:** PostgreSQL 16 (CMDB Topology) + Redis 7 (Zabbix Telemetry Cache)
- **Monitoring Integration:** Zabbix 7.0 JSON-RPC via Bearer API Token (Auto-synced every 30s)

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure (PostgreSQL & Redis)

PostgreSQL (port 5432) and Redis (port 6379) run via Docker:

```powershell
docker compose up -d redis
```

*(Note: PostgreSQL is running on port 5432 with database `dc_vision`)*

---

### 2. Run Backend (FastAPI)

```powershell
# Activate Python Virtual Environment
.\venv\Scripts\Activate.ps1

# Run Uvicorn Development Server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Swagger UI:** [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- **Healthcheck:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 3. Run Frontend (React 19 + Vite)

```powershell
cd frontend
npm run dev
```

- **Frontend URL:** [http://localhost:5173](http://localhost:5173)

---

## 🧪 Terminal Verification & Tests

### Backend Unit & Integration Tests (Pytest)
```powershell
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe backend\tests -v
```

### Frontend TypeScript & Build Check
```powershell
cd frontend
npm run build
```
