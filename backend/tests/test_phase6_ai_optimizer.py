import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.db.session import AsyncSessionLocal
from backend.app.schemas import PlacementRequest
from backend.app.services.optimizer_service import recommend_optimal_rack
from backend.app.services.ai_copilot_service import process_copilot_command


@pytest.mark.asyncio
async def test_placement_optimizer_constraints():
    """Verify spatial placement optimizer scores contiguous slots and power headroom"""
    async with AsyncSessionLocal() as session:
        # Request for standard 2U Enterprise Server with 500W
        req = PlacementRequest(
            u_height=2,
            power_watts=500,
            category="SERVER",
            preferred_row="Row A",
        )
        recommendations = await recommend_optimal_rack(session, req, limit=3)

        assert len(recommendations) > 0
        top = recommendations[0]

        # Verify recommendation structure and scoring
        assert top.u_height == 2
        assert 1 <= top.recommended_start_u <= 41
        assert top.composite_score > 0
        assert top.power_headroom_watts >= 500
        assert "Row A" in top.row_name
        assert len(top.reasoning) > 10
        assert len(top.available_slots) > 0


@pytest.mark.asyncio
async def test_placement_optimizer_storage_ru_zone():
    """Verify heavy storage is scored higher in lower RU slots (U1-U10)"""
    async with AsyncSessionLocal() as session:
        req = PlacementRequest(
            u_height=4,
            power_watts=800,
            category="STORAGE",
            weight_kg=40.0,
        )
        recommendations = await recommend_optimal_rack(session, req, limit=3)
        assert len(recommendations) > 0
        top = recommendations[0]
        # Low center of gravity preference
        assert top.ru_zone_score > 60


@pytest.mark.asyncio
async def test_ai_copilot_command_placement_intent():
    """Verify natural language copilot parses placement query into structured actions"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ai/command",
            json={"query": "Find me a 2U slot for a Dell server with at least 500W power in Row A"},
        )
        assert res.status_code == 200
        data = res.json()

        assert data["intent"] == "RECOMMEND_SLOT"
        assert len(data["recommendations"]) > 0
        assert len(data["actions"]) >= 2

        action_types = [a["type"] for a in data["actions"]]
        assert "FLY_TO_RACK" in action_types
        assert "OPEN_PROVISIONING_WIZARD" in action_types


@pytest.mark.asyncio
async def test_ai_copilot_command_fly_to_and_incident():
    """Verify natural language copilot handles camera fly-to and blast radius simulation"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fly to Rack
        res1 = await client.post(
            "/api/v1/ai/command",
            json={"query": "Fly to Rack R-A01"},
        )
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["intent"] == "NAVIGATE_OR_FLY"
        assert len(data1["actions"]) == 1
        assert data1["actions"][0]["type"] == "FLY_TO_RACK"
        assert "R-A01" in data1["actions"][0]["payload"]["rack_name"]

        # 2. Blast Radius Simulation
        res2 = await client.post(
            "/api/v1/ai/command",
            json={"query": "What happens if SW-TOR-R-A01 fails?"},
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["intent"] == "SIMULATE_INCIDENT"
        assert len(data2["actions"]) == 1
        assert data2["actions"][0]["type"] == "OPEN_BLAST_RADIUS"
        assert "SW-TOR-R-A01" in data2["message"]


@pytest.mark.asyncio
async def test_ai_copilot_knowledge_and_overlay_intent():
    """Verify SOP knowledge retrieval and heatmap overlay command handling"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Thermal Heatmap
        res_map = await client.post(
            "/api/v1/ai/command",
            json={"query": "Show thermal heatmap overlay"},
        )
        assert res_map.status_code == 200
        assert res_map.json()["intent"] == "SWITCH_MODE"
        assert res_map.json()["actions"][0]["type"] == "SET_HEATMAP"

        # 2. SOP Retrieval
        res_sop = await client.post(
            "/api/v1/ai/command",
            json={"query": "What is the emergency protocol for CRAC failure?"},
        )
        assert res_sop.status_code == 200
        data_sop = res_sop.json()
        assert data_sop["intent"] == "KNOWLEDGE_RAG"
        assert data_sop["knowledge_snippet"] is not None
        assert "CRAC" in data_sop["knowledge_snippet"]["title"]

        # 3. Direct Knowledge API
        res_kb = await client.get("/api/v1/ai/knowledge")
        assert res_kb.status_code == 200
        docs = res_kb.json()
        assert len(docs) >= 3
