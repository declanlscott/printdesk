from models import sqs_record
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


def inline(payload: sqs_record.Payload):
    ssl = Ssl(args=SslArgs(tenant_id=payload.tenantId))

    storage = Storage(args=StorageArgs(tenant_id=payload.tenantId))

    realtime = Realtime(args=RealtimeArgs(tenant_id=payload.tenantId))

    papercut_secure_reverse_proxy = PapercutSecureReverseProxy(
        args=PapercutSecureReverseProxyArgs(tenant_id=payload.tenantId)
    )

    events = Events(
        args=EventsArgs(
            tenant_id=payload.tenantId,
            reverse_dns=ssl.reverse_dns,
            invoices_processor_queue_arn=storage.queues["invoices_processor"].arn,
            papercut_sync_cron_expression=payload.papercutSyncCronExpression,
            timezone=payload.timezone,
        )
    )

    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenantId,
            alias=ssl.us_east_1_certificate.domain_name,
            certificate_arn=ssl.us_east_1_certificate.arn,
            api_origin_domain_name=ssl.api_domain_name.regional_domain_name,
            assets_origin_domain_name=storage.buckets["assets"].regional_domain_name,
            documents_origin_domain_name=storage.buckets[
                "documents"
            ].regional_domain_name,
        ),
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenantId,
            reverse_dns=ssl.reverse_dns,
            invoices_processor_queue_name=storage.queues["invoices_processor"].name,
            assets_bucket_name=storage.buckets["assets"].name,
            documents_bucket_name=storage.buckets["documents"].name,
            realtime_http_dns=realtime.dns["http"],
            realtime_dns=realtime.dns["realtime"],
            papercut_secure_reverse_proxy_function_name=papercut_secure_reverse_proxy.function_name,
            event_bus_name=events.event_bus.name,
            distribution_id=router.distribution.id,
        )
    )

    api_deployment = ApiDeployment(
        args=ApiDeploymentArgs(
            tenant_id=payload.tenantId,
            domain_name_id=ssl.api_domain_name.id,
            api=api,
        )
    )
