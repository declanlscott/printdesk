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
        )
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenant_id,
            router_secret_sst_resource_parameter=config.router_secret_sst_resource_parameter,
            config_agent_access_token_parameter=config.agent_access_token_parameter,
            config_application=config.application,
            config_environment=config.environment,
            config_profiles=config.profiles,
        ),
    )

    storage = Storage(
        args=StorageArgs(
            tenant_id=payload.tenant_id,
        )
    )

    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenant_id,
            secret=config.router_secret,
        )
    )

    realtime = Realtime(
        args=RealtimeArgs(
            tenant_id=payload.tenant_id,
        ),
    )
