import pulumi

from .event_api_provider import EventApiProvider

from typing import Mapping, Dict, Optional, Any
from types_boto3_appsync.type_defs import EventConfigTypeDef, EventConfigOutputTypeDef


class EventApiInputs:
    def __init__(
        self,
        tenant_id: str,
        owner_contact: Optional[pulumi.Input[str]] = None,
        tags: Optional[pulumi.Input[Mapping[str, str]]] = None,
        event_config: Optional[pulumi.Input[EventConfigTypeDef]] = None,
    ):
        self.tenant_id = tenant_id
        self.owner_contact = owner_contact
        self.tags = tags
        self.event_config = event_config


class EventApi(pulumi.dynamic.Resource):
    tenant_id: pulumi.Output[str]
    api_id: pulumi.Output[str]
    name: pulumi.Output[str]
    owner_contact: pulumi.Output[str]
    tags: pulumi.Output[Dict[str, str]]
    dns: pulumi.Output[Dict[str, str]]
    api_arn: pulumi.Output[str]
    created: pulumi.Output[str]
    xray_enabled: pulumi.Output[bool]
    waf_web_acl_arn: pulumi.Output[str]
    event_config: pulumi.Output[Dict[str, Any]]

    def __init__(self, name: str, props: EventApiInputs, opts: pulumi.ResourceOptions):
        super().__init__(
            provider=EventApiProvider(name=name),
            name=name,
            props={
                "tenant_id": None,
                "api_id": None,
                "name": None,
                "owner_contact": None,
                "tags": None,
                "dns": None,
                "api_arn": None,
                "created": None,
                "xray_enabled": None,
                "waf_web_acl_arn": None,
                "event_config": None,
                **vars(props),
            },
            opts=opts,
        )
