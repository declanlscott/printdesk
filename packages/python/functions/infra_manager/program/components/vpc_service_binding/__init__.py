from dataclasses import dataclass

import pulumi

from program.components.vpc_service_binding.provider import (
    VpcServiceBindingProvider,
)


@dataclass
class VpcServiceBindingArgs:
    script_name: pulumi.Input[str]
    name: pulumi.Input[str]
    service_id: pulumi.Input[str]


class VpcServiceBinding(pulumi.dynamic.Resource):
    script_name: pulumi.Output[str]
    name: pulumi.Output[str]
    service_id: pulumi.Output[str]

    def __init__(
        self,
        resource_name: str,
        args: VpcServiceBindingArgs,
        opts: pulumi.ResourceOptions,
    ):
        super().__init__(
            provider=VpcServiceBindingProvider(),
            name=resource_name,
            props=vars(args),
            opts=opts.merge(pulumi.ResourceOptions(delete_before_replace=True)),
        )
