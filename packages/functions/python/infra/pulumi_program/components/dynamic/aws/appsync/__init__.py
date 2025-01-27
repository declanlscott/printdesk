import pulumi
from datetime import datetime

from .api_provider import ApiProvider

from typing import TypedDict, NotRequired, Mapping, Dict
from types_boto3_appsync.type_defs import EventConfigTypeDef, EventConfigOutputTypeDef


class ApiInputs(TypedDict):
    name: NotRequired[pulumi.Input[str]]
    ownerContact: NotRequired[pulumi.Input[str]]
    tags: NotRequired[pulumi.Input[Mapping[str, str]]]
    eventConfig: NotRequired[pulumi.Input[EventConfigTypeDef]]


class Api(pulumi.dynamic.Resource):
    apiId: pulumi.Output[str]
    name: pulumi.Output[str]
    ownerContact: pulumi.Output[str]
    tags: pulumi.Output[Dict[str, str]]
    dns: pulumi.Output[Dict[str, str]]
    apiArn: pulumi.Output[str]
    created: pulumi.Output[datetime]
    xrayEnabled: pulumi.Output[bool]
    wafWebAclArn: pulumi.Output[str]
    eventConfig: pulumi.Output[EventConfigOutputTypeDef]

    def __init__(self, name: str, props: ApiInputs, opts: pulumi.ResourceOptions):
        super().__init__(
            provider=ApiProvider(name=name),
            name=name,
            props={
                "apiId": None,
                "name": props["name"],
                "ownerContact": props["ownerContact"],
                "tags": props["tags"],
                "dns": None,
                "apiArn": None,
                "created": None,
                "xrayEnabled": None,
                "wafWebAclArn": None,
                "eventConfig": props["eventConfig"],
            },
            opts=opts,
        )
