from dataclasses import dataclass

import pulumi

from program.components.assets.routes.provider import RoutesProvider


@dataclass
class RoutesArgs:
    tenant_id: pulumi.Input[str]
    store_arn: pulumi.Input[str]
    namespace: pulumi.Input[str]
    route_namespace: pulumi.Input[str]


class Routes(pulumi.dynamic.Resource):
    tenant_id: pulumi.Output[str]
    store_arn: pulumi.Output[str]
    namespace: pulumi.Output[str]
    route_id: pulumi.Output[str]

    def __init__(
        self,
        resource_name: str,
        args: RoutesArgs,
        opts: pulumi.ResourceOptions,
    ):
        super().__init__(
            provider=RoutesProvider(),
            name=resource_name,
            props=vars(args),
            opts=opts,
        )
