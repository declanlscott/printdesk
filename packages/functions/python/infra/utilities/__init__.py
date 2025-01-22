import json
import os

prefix = "FUNCTION_RESOURCE_"
resource = {}

for key, value in os.environ.items():
    if key.startswith(prefix):
        resource[key[len(prefix) :]] = json.loads(value)

stage: str = resource["AppData"]["stage"]
aws_region: str = resource["Aws"]["region"]
