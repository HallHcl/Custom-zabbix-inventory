from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import KnowledgeDocument
from backend.app.schemas import (
    PlacementRequest,
    PlacementRecommendation,
    CopilotCommandRequest,
    CopilotCommandResponse,
)
from backend.app.services.optimizer_service import recommend_optimal_rack
from backend.app.services.ai_copilot_service import process_copilot_command

router = APIRouter()


@router.post("/command", response_model=CopilotCommandResponse)
async def execute_copilot_command(
    payload: CopilotCommandRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Process a natural language AI Copilot query.
    Extracts intents, executes spatial constraints/graph tools,
    and returns a structured response with executable UI action payloads.
    """
    return await process_copilot_command(db, query=payload.query, context=payload.context)


@router.post("/optimize-placement", response_model=List[PlacementRecommendation])
async def get_placement_recommendations(
    request: PlacementRequest,
    limit: int = Query(default=3, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct endpoint for multi-constraint rack placement optimization.
    Evaluates contiguous U slots, power capacity, thermal gradients, and RU zone heuristics.
    """
    return await recommend_optimal_rack(db, request, limit=limit)


@router.get("/knowledge")
async def list_knowledge_documents(
    doc_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve datacenter SOPs, operational runbooks, and equipment manuals.
    """
    stmt = select(KnowledgeDocument)
    if doc_type:
        stmt = stmt.where(KnowledgeDocument.doc_type == doc_type.upper())
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "title": d.title,
            "doc_type": d.doc_type,
            "content": d.content,
            "has_embedding": d.embedding is not None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]
