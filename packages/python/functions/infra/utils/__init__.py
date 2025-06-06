import boto3
from sst import Resource
from types_boto3_sts import STSClient
from types_boto3_sts.type_defs import CredentialsTypeDef

is_prod_stage = Resource.AppData.stage == "production"


def tags(tenant_id: str):
    return {
        "sst:app": Resource.AppData.name,
        "sst:stage": Resource.AppData.stage,
        "tenant-id": tenant_id,
    }


def build_name(name_template: str, tenant_id: str) -> str:
    return name_template.replace("{{tenant_id}}", tenant_id)


def reverse_dns(domain_name: str) -> str:
    return ".".join(domain_name.split(".")[::-1])


sts: STSClient = boto3.client("sts")


def get_pulumi_credentials(session_name: str) -> CredentialsTypeDef:
    return sts.assume_role(
        RoleArn=Resource.PulumiRole.arn,
        RoleSessionName=session_name,
        ExternalId=Resource.PulumiRoleExternalId.value,
    )["Credentials"]


def get_realtime_credentials(session_name: str) -> CredentialsTypeDef:
    return sts.assume_role(
        RoleArn=Resource.RealtimePublisherRole.arn,
        RoleSessionName=session_name,
        ExternalId=Resource.RealtimePublisherRoleExternalId.value,
    )["Credentials"]
