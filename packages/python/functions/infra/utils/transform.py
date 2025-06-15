from typing import Dict, Tuple

import pulumi

from . import naming


def name(tenant_id: str):
    rules: Dict[str, Tuple[str, int]] = {
        "aws:appconfig/application:Application": ("name", 64),
        "aws:appconfig/configurationProfile:ConfigurationProfile": ("name", 128),
        "aws:appconfig/environment:Environment": ("name", 64),
        "aws:apigatewayv2/api:Api": ("name", 128),
        "aws:iam/role:Role": ("name", 64),
    }

    def transform(args: pulumi.ResourceTransformationArgs):
        rule = rules.get(args.resource.pulumi_resource_type)
        if rule is None or rule[0] in args.props:
            return None

        return pulumi.ResourceTransformationResult(
            props={
                **args.props,
                rule[0]: naming.physical(rule[1], args.name, tenant_id)
            },
            opts=args.opts,
        )

    return transform
