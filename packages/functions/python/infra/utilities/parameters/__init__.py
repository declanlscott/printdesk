from .. import resource
from ..aws import ssm


cloudflare_api_token = ssm.get_parameter(
    Name=f"/{resource["AppData"]["name"]}/{resource["AppData"]["stage"]}/cloudflare/api-token",
    WithDecryption=True,
)["Parameter"]["Value"]
