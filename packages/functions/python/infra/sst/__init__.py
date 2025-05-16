import base64
import json
import os
from typing import Dict, Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

raw: Dict[str, Any] = {}

environment = os.environ
for key, value in environment.items():
    if key.startswith("CUSTOM_SST_RESOURCE_") and value:
        raw[key[len("CUSTOM_SST_RESOURCE_") :]] = json.loads(value)

if (
    "CUSTOM_SST_KEY_FILE" in os.environ
    and "CUSTOM_SST_KEY" in os.environ
    and "CUSTOM_SST_KEY_FILE_DATA" not in globals()
):
    key = base64.b64decode(os.environ["CUSTOM_SST_KEY"])

    with open(os.environ["CUSTOM_SST_KEY_FILE"], "rb") as file:
        ciphertext = file.read()

    plaintext = AESGCM(key).decrypt(
        nonce=bytes(12),
        data=ciphertext[:-16] + ciphertext[-16:],
        associated_data=None,
    )

    data = json.loads(plaintext.decode("utf-8"))

    raw.update(data)

    globals()["CUSTOM_SST_KEY_FILE_DATA"] = data

if "CUSTOM_SST_KEY_FILE_DATA" in globals():
    raw.update(globals()["CUSTOM_SST_KEY_FILE_DATA"])


class AttrDict:
    def __init__(self, data):
        for key, value in data.items():
            self.__dict__[key] = self._wrap(value)

    def _wrap(self, value):
        if isinstance(value, dict):
            return AttrDict(value)
        elif isinstance(value, list):
            return [self._wrap(item) for item in value]
        else:
            return value

    def __getattr__(self, item):
        if item in self.__dict__:
            return self.__dict__[item]
        raise AttributeError(f"'AttrDict' object has no attribute '{item}'")

    def __setattr__(self, key, value):
        self.__dict__[key] = value


raw = AttrDict(raw)


class ResourceProxy:
    def __getattr__(self, prop):
        if hasattr(raw, prop):
            return getattr(raw, prop)

        raise Exception(f'"{prop}" is not linked in your sst.config.ts')


Resource = ResourceProxy()
