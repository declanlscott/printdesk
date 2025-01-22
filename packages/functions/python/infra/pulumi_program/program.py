import pulumi
import pulumi_aws as aws

from models import sqs_record

from utilities import aws_region, resource
from .components.account import Account, AccountArgs


def inline(payload: sqs_record.Payload):
    management_provider = aws.provider.Provider(
        "Provider",
        region=aws_region,
        assume_role=aws.provider.ProviderAssumeRoleArgs(
            role_arn=resource["Aws"]["organization"]["managementRole"]["arn"],
        ),
    )

    account = Account(
        "Account",
        args=AccountArgs(tenant_id=payload.tenantId),
        opts=pulumi.ResourceOptions(providers=[management_provider]),
    )

    account.assume_role_arn.apply(lambda arn: print(f"Account assume role arn: {arn}"))
