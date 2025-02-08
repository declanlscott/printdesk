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
    ApiDeployment,
    ApiDeploymentArgs,
    Events,
    EventsArgs,
)
from models import sqs_record
from utilities import tags, region, stage, reverse_dns


def inline(payload: sqs_record.Payload):
    ssl = Ssl(args=SslArgs(tenant_id=payload.tenantId))

    reverse_dns_ = ssl.domain_name.apply(reverse_dns)

    apigateway_account = setup_api_gateway_account()

    gateway = aws.apigateway.RestApi(
        resource_name="Gateway",
        args=aws.apigateway.RestApiArgs(
            endpoint_configuration=aws.apigateway.RestApiEndpointConfigurationArgs(
                types="REGIONAL"
            ),
            description=f"{payload.tenantId} gateway",
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
            ssl=ssl,
            api_origin_domain_name=pulumi.Output.format(
                "{0}.execute-api.{1}.amazonaws.com", gateway.id, region
            ),
            api_origin_path=f"/{stage}",
            assets_origin_domain_name=storage.buckets["assets"].regional_domain_name,
            documents_origin_domain_name=storage.buckets[
                "documents"
            ].regional_domain_name,
        ),
    )

    papercut_secure_reverse_proxy = PapercutSecureReverseProxy(
        args=PapercutSecureReverseProxyArgs(tenant_id=payload.tenantId)
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenantId,
            gateway=gateway,
            event_bus=event_bus,
            storage=storage,
            distribution_id=router.distribution_id,
            reverse_dns=reverse_dns_,
            realtime=realtime,
            papercut_secure_reverse_proxy=papercut_secure_reverse_proxy,
        )
    )

    api_deployment = ApiDeployment(
        args=ApiDeploymentArgs(
            tenant_id=payload.tenantId,
            gateway=gateway,
            api=api,
        )
    )

    events = Events(
        args=EventsArgs(
            tenant_id=payload.tenantId,
            event_bus=event_bus,
            invoices_processor_queue_arn=storage.queues["invoices_processor"].arn,
            papercut_sync_schedule=payload.papercutSyncSchedule,
            timezone=payload.timezone,
            reverse_dns=reverse_dns_,
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
