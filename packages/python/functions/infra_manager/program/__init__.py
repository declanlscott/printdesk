from datetime import datetime
from typing import List, Optional

import pulumi
import pulumi_aws as aws
import pulumiverse_time as time
from sst import Resource

from utils import SEPARATOR
from program.components import (
    Assets,
    AssetsArgs,
    Papercut,
    PapercutArgs,
    Realtime,
    RealtimeArgs,
)
from models import Input, Output


def inline(tenant_id: str, _input: Input):
    resources: List[pulumi.Input[pulumi.Resource]] = [
        Assets(args=AssetsArgs(tenant_id=tenant_id)),
        Realtime(args=RealtimeArgs(tenant_id=tenant_id)),
    ]

    papercut: Optional[Papercut] = None
    if _input.papercut_config.enabled:
        papercut = Papercut(
            args=PapercutArgs(
                tenant_id=tenant_id,
                config=_input.papercut_config,
            )
        )

        resources.append(papercut)

    output_pk = f"{Resource.Dynamo.keyLiterals.TENANT}{SEPARATOR}{tenant_id}{SEPARATOR}"
    output_sk = f"{Resource.Dynamo.keyLiterals.INFRA}{SEPARATOR}{Resource.Dynamo.keyLiterals.OUTPUT}{SEPARATOR}"
    deployed_at = time.Static(
        resource_name="DeployedAt",
        args=time.StaticArgs(triggers={"now": datetime.now()}),
        opts=pulumi.ResourceOptions(depends_on=resources),
    )

    aws.dynamodb.TableItem(
        resource_name="Output",
        args=aws.dynamodb.TableItemArgs(
            table_name=Resource.Dynamo.name,
            hash_key=output_pk,
            range_key=output_sk,
            item=pulumi.Output.all(
                papercut_api_tunnel_id=getattr(
                    papercut,
                    "api_tunnel_id",
                    pulumi.Output.from_input(None),
                ),
                deployed_at=deployed_at.unix.apply(datetime.fromtimestamp),
            ).apply(
                lambda data: Output(
                    pk=output_pk,
                    sk=output_sk,
                    papercut_api_tunnel_id=data["papercut_api_tunnel_id"],
                    deployed_at=data["deployed_at"],
                ).model_dump_json()
            ),
        ),
        opts=pulumi.ResourceOptions(depends_on=resources),
    )
