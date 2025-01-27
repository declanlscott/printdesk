import boto3
from types_boto3_ssm import SSMClient
from types_boto3_sts import STSClient
from types_boto3_sts.type_defs import CredentialsTypeDef

from utilities import resource


ssm: SSMClient = boto3.client("ssm")
sts: STSClient = boto3.client("sts")


def get_pulumi_credentials(session_name: str) -> CredentialsTypeDef:
    return sts.assume_role(
        RoleArn=resource["Aws"]["roles"]["pulumi"]["arn"],
        RoleSessionName=session_name,
    )["Credentials"]
