from .components import (
    Api,
    ApiArgs,
    Config,
    ConfigArgs,
    Router,
    RouterArgs,
    Realtime,
    RealtimeArgs,
    Storage,
    StorageArgs,
)
from models import sqs_record


def inline(payload: sqs_record.Payload):
    config = Config(
        args=ConfigArgs(
            tenant_id=payload.tenant_id,
        ),
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenant_id,
            static_config=config.static,
            dynamic_config=config.dynamic,
        ),
    )

    storage = Storage(
        args=StorageArgs(
            tenant_id=payload.tenant_id,
        ),
    )

    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenant_id,
            secret=config.dynamic.router_secret,
            api_domain_name=api.domain_name,
            assets_domain_name=storage.assets_bucket.regional_domain_name,
            documents_domain_name=storage.documents_bucket.regional_domain_name,
        ),
    )

    realtime = Realtime(
        args=RealtimeArgs(
            tenant_id=payload.tenant_id,
        ),
    )
