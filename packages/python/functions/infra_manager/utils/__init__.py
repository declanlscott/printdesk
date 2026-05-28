from sst import Resource

from utils.cloudflare import Cloudflare
from utils import crypto
from utils import naming


is_prod_stage = Resource.App.stage == "prod"
SEPARATOR = chr(0x1F)

tenant_id_key_pattern = rf"^{Resource.Dynamo.keyLiterals.TENANT}{SEPARATOR}{Resource.NanoId.pattern.strip('^$')}{SEPARATOR}$"
infra_input_key_pattern = rf"^{Resource.Dynamo.keyLiterals.INFRA}{SEPARATOR}{Resource.Dynamo.keyLiterals.INPUT}{SEPARATOR}$"
infra_output_key_pattern = rf"^{Resource.Dynamo.keyLiterals.INFRA}{SEPARATOR}{Resource.Dynamo.keyLiterals.OUTPUT}{SEPARATOR}$"
ipv4_pattern = (
    r"^(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])(?:\.(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])){3}$"
)

__all__ = [
    "Cloudflare",
    "crypto",
    "is_prod_stage",
    "naming",
    "SEPARATOR",
    "tenant_id_key_pattern",
    "infra_input_key_pattern",
    "infra_output_key_pattern",
    "ipv4_pattern",
]
