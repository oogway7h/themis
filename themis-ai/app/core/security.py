import secrets

from fastapi import Header, HTTPException, status

from app.core.config import get_settings

SERVICE_TOKEN_HEADER = "x-service-token"


def require_service_token(
    x_service_token: str | None = Header(default=None, alias=SERVICE_TOKEN_HEADER),
) -> None:
    settings = get_settings()

    if x_service_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Cabecera {SERVICE_TOKEN_HEADER} ausente",
        )

    if not secrets.compare_digest(x_service_token, settings.service_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de servicio invalido",
        )
