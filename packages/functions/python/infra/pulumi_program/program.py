import pulumi
import pulumi_aws as aws

from .components import (
    Ssl,
    SslArgs,
    Storage,
    StorageArgs,
    Realtime,
    RealtimeArgs,
    Router,
    RouterArgs,
)
from models import sqs_record
from utilities import tags, region, stage


def inline(payload: sqs_record.Payload):
    ssl = Ssl(args=SslArgs(tenant_id=payload.tenantId))

    gateway = aws.apigateway.RestApi(
        "Gateway",
        aws.apigateway.RestApiArgs(
            endpoint_configuration=aws.apigateway.RestApiEndpointConfigurationArgs(
                types="REGIONAL"
            ),
            tags=tags(payload.tenantId),
        ),
    )

    storage = Storage(args=StorageArgs(tenant_id=payload.tenantId))

    realtime = Realtime(args=RealtimeArgs(tenant_id=payload.tenantId))

    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenantId,
            domain_name=ssl.domain_name,
            api_origin_domain_name=pulumi.Output.format(
                "{0}.execute-api.{1}.amazonaws.com", gateway.id, region
            ),
            api_origin_path=f"/{stage}",
            assets_origin_domain_name=storage.buckets["assets"].regional_domain_name,
            documents_origin_domain_name=storage.buckets[
                "documents"
            ].regional_domain_name,
            certificate_arn=ssl.certificate_arn,
        ),
    )
