from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.api import SettingsGeneralRequest, SettingsStatusResponse, SettingsTokenRequest
from app.services.settings_service import SettingsService

router = APIRouter()


def _settings_response(service: SettingsService) -> SettingsStatusResponse:
    return SettingsStatusResponse(
        avalai_configured=service.has_avalai_api_key(),
        usd_to_toman=service.get_usd_to_toman(),
    )


@router.get("/status", response_model=SettingsStatusResponse)
def get_settings_status(db: Session = Depends(get_db)):
    service = SettingsService(db)
    return _settings_response(service)


@router.put("/token", response_model=SettingsStatusResponse)
def save_token(payload: SettingsTokenRequest, db: Session = Depends(get_db)):
    service = SettingsService(db)
    service.set_avalai_api_key(payload.api_key)
    return _settings_response(service)


@router.delete("/token", response_model=SettingsStatusResponse)
def delete_token(db: Session = Depends(get_db)):
    service = SettingsService(db)
    service.clear_avalai_api_key()
    if not service.has_avalai_api_key():
        return _settings_response(service)
    raise HTTPException(status_code=400, detail="Unable to clear API token")


@router.put("/general", response_model=SettingsStatusResponse)
def save_general_settings(payload: SettingsGeneralRequest, db: Session = Depends(get_db)):
    service = SettingsService(db)
    service.set_usd_to_toman(payload.usd_to_toman)
    return _settings_response(service)
