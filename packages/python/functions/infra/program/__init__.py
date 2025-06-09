from .components import Api, ApiArgs, Router, RouterArgs
from models import sqs_record


def inline(payload: sqs_record.Payload):
    router = Router(
        args=RouterArgs(
            tenant_id=payload.tenantId
        )
    )

    api = Api(
        args=ApiArgs(
            tenant_id=payload.tenantId,
            router_secret=router.secret,
        )
    )
