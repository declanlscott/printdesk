import pulumi

from .event_api_provider import EventApiProvider
from .channel_namespace_provider import ChannelNamespaceProvider

from typing import Dict, Optional, Any, Sequence, List
from types_boto3_appsync.type_defs import EventConfigTypeDef, AuthModeTypeDef


class EventApiInputs:
    def __init__(
        self,
        tenant_id: str,
        owner_contact: Optional[pulumi.Input[str]] = None,
        event_config: Optional[pulumi.Input[EventConfigTypeDef]] = None,
    ):
        self.tenant_id = tenant_id
        self.owner_contact = owner_contact
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

    def __init__(
        self,
        name: str,
        props: EventApiInputs,
        opts: pulumi.ResourceOptions,
    ):
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


class ChannelNamespaceInputs:
    def __init__(
        self,
        tenant_id: str,
        api_id: pulumi.Input[str],
        name: pulumi.Input[str],
        subscribe_auth_modes: Optional[pulumi.Input[Sequence[AuthModeTypeDef]]] = None,
        publish_auth_modes: Optional[pulumi.Input[Sequence[AuthModeTypeDef]]] = None,
        code_handlers: Optional[pulumi.Input[str]] = None,
    ):
        self.tenant_id = tenant_id
        self.api_id = api_id
        self.name = name
        self.subscribe_auth_modes = subscribe_auth_modes
        self.publish_auth_modes = publish_auth_modes
        self.code_handlers = code_handlers


class ChannelNamespace(pulumi.dynamic.Resource):
    tenant_id: pulumi.Output[str]
    api_id: pulumi.Output[str]
    name: pulumi.Output[str]
    channel_namespace_arn: pulumi.Output[str]
    created: pulumi.Output[str]
    last_modified: pulumi.Output[str]
    subscribe_auth_modes: pulumi.Output[List[Dict[str, Any]]]
    publish_auth_modes: pulumi.Output[List[Dict[str, Any]]]
    code_handlers: pulumi.Output[str]
    tags: pulumi.Output[Dict[str, str]]

    def __init__(
        self,
        name: str,
        props: ChannelNamespaceInputs,
        opts: pulumi.ResourceOptions,
    ):
        super().__init__(
            provider=ChannelNamespaceProvider(),
            name=name,
            props={
                "api_id": None,
                "name": None,
                "channel_namespace_arn": None,
                "created": None,
                "last_modified": None,
                "subscribe_auth_modes": None,
                "publish_auth_modes": None,
                "code_handlers": None,
                "tags": None,
                **vars(props),
            },
            opts=opts,
        )
