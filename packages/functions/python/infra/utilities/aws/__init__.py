import boto3

ssm = boto3.client("ssm")
sts = boto3.client("sts")


def build_name(name_template: str, tenant_id: str) -> str:
    return name_template.replace("{{tenant_id}}", tenant_id)
