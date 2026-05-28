from dataclasses import dataclass

import pulumi
import pulumi_aws as aws
from sst import Resource

from program.components.assets.routes import Routes, RoutesArgs
from utils import naming


@dataclass
class RouteArgs:
    tenant_id: pulumi.Input[str]
    domain: pulumi.Input[str]


class Route(pulumi.ComponentResource):
    def __init__(self, args: RouteArgs, opts: pulumi.ResourceOptions):
        super().__init__(
            t="pd:aws:AssetsRoute",
            name="AssetsRoute",
            props=vars(args),
            opts=opts,
        )

        namespace: pulumi.Output[str] = pulumi.Output.from_input(args.tenant_id).apply(
            naming.build_kv_namespace
        )

        self._metadata = aws.cloudfront.KeyvaluestoreKey(
            resource_name="AssetsRouteMetadata",
            args=aws.cloudfront.KeyvaluestoreKeyArgs(
                key_value_store_arn=Resource.AssetsRouter.keyValueStoreArn,
                key=pulumi.Output.format("{0}:metadata", namespace),
                value=pulumi.Output.json_dumps(
                    {"domain": pulumi.Output.from_input(args.domain)}
                ),
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )

        self._routes = Routes(
            resource_name="AssetsRoutes",
            args=RoutesArgs(
                tenant_id=args.tenant_id,
                store_arn=Resource.AssetsRouter.keyValueStoreArn,
                namespace=Resource.AssetsRouter.keyValueStoreNamespace,
                route_namespace=namespace,
            ),
            opts=pulumi.ResourceOptions(parent=self),
        )
