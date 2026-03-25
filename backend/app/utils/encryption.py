"""Utility functions for encrypting and decrypting sensitive values using Fernet."""

import os
import logging

from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    """Return a cached Fernet instance, creating one from ENCRYPTION_KEY env var."""
    global _fernet
    if _fernet is not None:
        return _fernet

    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        logger.warning(
            "ENCRYPTION_KEY not set — generating a temporary key. "
            "Set ENCRYPTION_KEY in .env for persistent encryption."
        )
        key = Fernet.generate_key().decode()
        os.environ["ENCRYPTION_KEY"] = key

    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_value(plain_text: str) -> str:
    """Encrypt a plain-text string and return the encrypted token as a string."""
    if not plain_text:
        return plain_text
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_value(encrypted_text: str) -> str:
    """Decrypt an encrypted token back to plain text.

    If decryption fails (e.g. value was stored before encryption was enabled),
    returns the original value as-is so the system degrades gracefully.
    """
    if not encrypted_text:
        return encrypted_text
    f = _get_fernet()
    try:
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception:
        logger.debug("Could not decrypt value — returning as-is (may be plain text)")
        return encrypted_text
