import pulumi_random as random

from .components import (
    Api,
    ApiArgs,
    Router,
    RouterArgs,
    Realtime,
    RealtimeArgs,
    Storage,
    StorageArgs,
)
from models import sqs_record


def inline(payload: sqs_record.Payload):
    router_secret = random.RandomPassword(
            resource_name="RouterSecret",
            args=random.RandomPasswordArgs(
                length=32,
                special=True,
            ),
        )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenantId,
            router_secret=router_secret.result,
        ),
    )

    storage = Storage(
        args=StorageArgs(
            tenant_id=payload.tenantId,
        )
    )

    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenantId,
            secret=router_secret.result
        )
    )

    realtime = Realtime(
        args=RealtimeArgs(
            tenant_id=payload.tenantId,
        ),
    )
