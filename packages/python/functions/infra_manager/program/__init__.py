from datetime import datetime, timezone

import pulumi
import pulumi_aws as aws
import pulumiverse_time as time
from models import Input, Output
from utils import SEPARATOR

from program.components import (
    Assets,
    AssetsArgs,
    Config,
    ConfigArgs,
    PapercutMf,
    PapercutMfArgs,
    Realtime,
    RealtimeArgs,
)
from sst import Resource


def inline(tenant_id: str, _input: Input):
    resources: list[pulumi.Input[pulumi.Resource]] = [
        Assets(args=AssetsArgs(tenant_id=tenant_id)),
        Config(args=ConfigArgs(tenant_id=tenant_id)),
        Realtime(args=RealtimeArgs(tenant_id=tenant_id)),
    ]

    papercut_mf: PapercutMf | None = None
    if _input.papercut_mf_config.enabled:
        papercut_mf = PapercutMf(
            args=PapercutMfArgs(
                tenant_id=tenant_id,
                config=_input.papercut_mf_config,
            )
        )

        resources.append(papercut_mf)

    output_pk = SEPARATOR.join([Resource.Dynamo.keyLiterals.TENANT, tenant_id])
    output_sk = SEPARATOR.join(
        [Resource.Dynamo.keyLiterals.INFRA, Resource.Dynamo.keyLiterals.OUTPUT]
    )
    output_gsi1_pk = SEPARATOR.join(
        [
            Resource.Dynamo.keyLiterals.TENANT,
            tenant_id,
            Resource.Dynamo.keyLiterals.DEPLOYMENT,
            _input.deployment_id,
        ]
    )
    output_gsi1_sk = output_sk
    deployed_at = time.Static(
        resource_name="DeployedAt",
        args=time.StaticArgs(triggers={"now": datetime.now(tz=timezone.utc)}),
        opts=pulumi.ResourceOptions(depends_on=resources),
    )

    output_item = pulumi.Output.all(
        papercut_mf_api_tunnel_id=getattr(
            papercut_mf,
            "api_tunnel_id",
            pulumi.Output.from_input(None),
        ),
        deployed_at=deployed_at.unix.apply(
            lambda unix: datetime.fromtimestamp(timestamp=unix, tz=timezone.utc)
        ),
    ).apply(
        lambda data: Output(
            pk=output_pk,
            sk=output_sk,
            gsi1_pk=output_gsi1_pk,
            gsi1_sk=output_gsi1_sk,
            papercut_mf_api_tunnel_id=data["papercut_mf_api_tunnel_id"],
            deployed_at=data["deployed_at"],
        ).model_dump_json(by_alias=True)
    )

    aws.dynamodb.TableItem(
        resource_name="Output",
        args=aws.dynamodb.TableItemArgs(
            table_name=Resource.Dynamo.name,
            hash_key=output_pk,
            range_key=output_sk,
            item=output_item,
        ),
        opts=pulumi.ResourceOptions(depends_on=resources),
    )

    pulumi.export("output", output_item)
