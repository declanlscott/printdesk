import os
import json

task_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
resource_file_path = os.path.join(task_root, "resource.json")
with open(resource_file_path, "r") as resource_file:
    data = json.load(resource_file)
resource = {key: json.loads(value) for key, value in data.items()}

app: str = resource["AppData"]["name"]
stage: str = resource["AppData"]["stage"]
account_id: str = resource["Aws"]["account"]["id"]
region: str = resource["Aws"]["region"]
retain_on_delete = stage == "production"


def tags(tenant_id: str):
    return {"sst:app": app, "sst:stage": stage, "tenant-id": tenant_id}


def build_name(name_template: str, tenant_id: str) -> str:
    return name_template.replace("{{tenant_id}}", tenant_id)
