import json
import os

prefix = "FUNCTION_RESOURCE_"
resource = {}

for key, value in os.environ.items():
    if key.startswith(prefix):
        resource[key[len(prefix) :]] = json.loads(value)

app: str = resource["AppData"]["name"]
stage: str = resource["AppData"]["stage"]
account_id: str = resource["Aws"]["account"]["id"]
region: str = resource["Aws"]["region"]
retain_on_delete = stage == "production"


def tags(tenant_id: str):
    return {"sst:app": app, "sst:stage": stage, "tenant-id": tenant_id}
