import os
import base64
import hashlib

from models import Hash


def generate_token(size: int = 32) -> str:
    random_bytes = os.urandom(size)
    return base64.b64encode(random_bytes).decode("utf-8")


def derive_key_from_secret(secret: str, salt: str) -> str:
    derived_key = hashlib.scrypt(
        secret.strip().encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )

    return base64.b64encode(derived_key).decode("utf-8")


def hash_secret(secret: str) -> Hash:
    salt = generate_token(16)
    derived_key = derive_key_from_secret(secret, salt)

    return Hash(salt=salt, derived_key=derived_key)
