from sst import Resource
from utils import naming

is_prod_stage = Resource.App.stage == "prod"
SEPARATOR = chr(0x1F)

nano_id_pattern = Resource.NanoId.pattern.strip("^$")

tenant_id_key_pattern = (
    rf"^{Resource.Dynamo.keyLiterals.TENANT}{SEPARATOR}{nano_id_pattern}$"
)
tenant_deployment_id_key_pattern = rf"^{Resource.Dynamo.keyLiterals.TENANT}{SEPARATOR}{nano_id_pattern}{SEPARATOR}{Resource.Dynamo.keyLiterals.DEPLOYMENT}{SEPARATOR}{nano_id_pattern}$"
infra_input_key_pattern = rf"^{Resource.Dynamo.keyLiterals.INFRA}{SEPARATOR}{Resource.Dynamo.keyLiterals.INPUT}$"
infra_output_key_pattern = rf"^{Resource.Dynamo.keyLiterals.INFRA}{SEPARATOR}{Resource.Dynamo.keyLiterals.OUTPUT}$"
ipv4_pattern = (
    r"^(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])(?:\.(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])){3}$"
)

__all__ = [
    "SEPARATOR",
    "infra_input_key_pattern",
    "infra_output_key_pattern",
    "ipv4_pattern",
    "is_prod_stage",
    "naming",
    "tenant_id_key_pattern",
]
