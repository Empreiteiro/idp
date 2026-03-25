"""Symmetric encryption for sensitive settings (API keys)."""
import os
from cryptography.fernet import Fernet

_KEY = os.environ.get("ENCRYPTION_KEY", "")

def _get_cipher():
    if not _KEY:
        return None
    try:
        return Fernet(_KEY.encode() if isinstance(_KEY, str) else _KEY)
    except Exception:
        return None

def encrypt_value(value: str) -> str:
    cipher = _get_cipher()
    if not cipher:
        return value
    return "enc:" + cipher.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    if not value.startswith("enc:"):
        return value
    cipher = _get_cipher()
    if not cipher:
        return value
    try:
        return cipher.decrypt(value[4:].encode()).decode()
    except Exception:
        return value
