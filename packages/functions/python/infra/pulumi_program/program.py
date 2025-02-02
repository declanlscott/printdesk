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
    PapercutSecureReverseProxy,
    PapercutSecureReverseProxyArgs,
    Api,
    ApiArgs,
    Events,
    EventsArgs,
)
from models import sqs_record
from utilities import tags, region, stage


def inline(payload: sqs_record.Payload):
    ssl = Ssl(args=SslArgs(tenant_id=payload.tenantId))

    apigateway_account = setup_api_gateway_account()

    gateway = aws.apigateway.RestApi(
        resource_name="Gateway",
        args=aws.apigateway.RestApiArgs(
            endpoint_configuration=aws.apigateway.RestApiEndpointConfigurationArgs(
                types="REGIONAL"
            ),
            tags=tags(payload.tenantId),
        ),
        opts=pulumi.ResourceOptions(depends_on=[apigateway_account]),
    )

    event_bus = aws.cloudwatch.EventBus(
        resource_name="EventBus",
        args=aws.cloudwatch.EventBusArgs(
            tags=tags(payload.tenantId),
            description=f"{payload.tenantId} event bus",
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

    papercut_secure_reverse_proxy = PapercutSecureReverseProxy(
        args=PapercutSecureReverseProxyArgs(
            tenant_id=payload.tenantId,
        )
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenantId,
            gateway=gateway,
            event_bus_name=event_bus.name,
            invoices_processor_queue_arn=storage.queues["invoices_processor"].arn,
            invoices_processor_queue_name=storage.queues["invoices_processor"].name,
            invoices_processor_queue_url=storage.queues["invoices_processor"].url,
            distribution_id=router.distribution_id,
            domain_name=ssl.domain_name,
            appsync_http_domain_name=realtime.dns["http"],
            appsync_realtime_domain_name=realtime.dns["realtime"],
            papercut_secure_reverse_proxy_function_invoke_arn=papercut_secure_reverse_proxy.invoke_arn,
        )
    )

    events = Events(
        args=EventsArgs(
            tenant_id=payload.tenantId,
            event_bus_name=event_bus.name,
            invoices_processor_queue_arn=storage.queues["invoices_processor"].arn,
            papercut_sync_schedule=payload.papercutSyncSchedule,
            timezone=payload.timezone,
            domain_name=ssl.domain_name,
        )
    )


def setup_api_gateway_account() -> pulumi.Output[aws.apigateway.Account]:
    account = aws.apigateway.Account.get(
        resource_name="APIGatewayAccount",
        id="APIGatewayAccount",
    )

    def create_role(arn):
        if arn:
            return account

        role = aws.iam.Role(
            resource_name="APIGatewayPushToCloudWatchLogsRole",
            args=aws.iam.RoleArgs(
                assume_role_policy=aws.iam.get_policy_document_output(
                    statements=[
                        aws.iam.GetPolicyDocumentStatementArgs(
                            principals=[
                                aws.iam.GetPolicyDocumentStatementPrincipalArgs(
                                    type="Service",
                                    identifiers=["apigateway.amazonaws.com"],
                                )
                            ],
                            actions=["sts:AssumeRole"],
                        )
                    ]
                ).minified_json,
                managed_policy_arns=[
                    aws.iam.ManagedPolicy.AMAZON_API_GATEWAY_PUSH_TO_CLOUD_WATCH_LOGS
                ],
            ),
            opts=pulumi.ResourceOptions(retain_on_delete=True),
        )

        return aws.apigateway.Account(
            resource_name="APIGatewayAccountSetup",
            args=aws.apigateway.AccountArgs(cloudwatch_role_arn=role.arn),
        )

    return account.cloudwatch_role_arn.apply(create_role)
