"""记录路由 - 提交游戏记录"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.record import RecordSubmit, RecordSubmitResponse
from schemas.common import ApiResponse
from services.record_service import RecordService
from rate_limit import limiter

router = APIRouter()


@router.post("", response_model=ApiResponse[RecordSubmitResponse], status_code=201)
@limiter.limit("30/minute")
async def submit_record(
    req: RecordSubmit,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交游戏记录"""
    service = RecordService(db)
    result = await service.submit(
        user=current_user,
        game_id=req.game_id,
        score=req.score,
        duration=req.duration,
        metadata=req.metadata,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
    return ApiResponse(data=result, message="记录已提交")
