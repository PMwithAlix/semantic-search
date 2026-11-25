from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.encryption import decrypt_secret, encrypt_secret
from app.models.entities import EncryptedSetting

AVALAI_KEY_NAME = "avalai_api_key"
USD_TO_TOMAN_KEY = "usd_to_toman"


class SettingsService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def get_avalai_api_key(self) -> str | None:
        record = self.db.query(EncryptedSetting).filter_by(key_name=AVALAI_KEY_NAME).one_or_none()
        if record:
            return decrypt_secret(record.encrypted_value)
        return self.settings.avalai_api_key

    def set_avalai_api_key(self, api_key: str) -> None:
        encrypted = encrypt_secret(api_key)
        record = self.db.query(EncryptedSetting).filter_by(key_name=AVALAI_KEY_NAME).one_or_none()
        if record:
            record.encrypted_value = encrypted
        else:
            self.db.add(EncryptedSetting(key_name=AVALAI_KEY_NAME, encrypted_value=encrypted))
        self.db.commit()

    def has_avalai_api_key(self) -> bool:
        return bool(self.get_avalai_api_key())

    def clear_avalai_api_key(self) -> None:
        record = self.db.query(EncryptedSetting).filter_by(key_name=AVALAI_KEY_NAME).one_or_none()
        if record:
            self.db.delete(record)
            self.db.commit()

    def get_usd_to_toman(self) -> float | None:
        record = self.db.query(EncryptedSetting).filter_by(key_name=USD_TO_TOMAN_KEY).one_or_none()
        if not record:
            return None
        try:
            rate = float(decrypt_secret(record.encrypted_value))
        except (TypeError, ValueError):
            return None
        return rate if rate > 0 else None

    def set_usd_to_toman(self, rate: float | None) -> None:
        record = self.db.query(EncryptedSetting).filter_by(key_name=USD_TO_TOMAN_KEY).one_or_none()
        if rate is None or rate <= 0:
            if record:
                self.db.delete(record)
                self.db.commit()
            return
        encrypted = encrypt_secret(str(rate))
        if record:
            record.encrypted_value = encrypted
        else:
            self.db.add(EncryptedSetting(key_name=USD_TO_TOMAN_KEY, encrypted_value=encrypted))
        self.db.commit()
