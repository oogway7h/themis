from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Estado del microservicio")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "themis-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
