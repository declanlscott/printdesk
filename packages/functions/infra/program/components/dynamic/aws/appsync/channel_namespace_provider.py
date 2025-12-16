from typing import (
    TypedDict,
    NotRequired,
    List,
    Dict,
    Unpack,
    Sequence,
)

import pulumi
from types_boto3_appsync.type_defs import (
    ChannelNamespaceTypeDef,
    CreateChannelNamespaceRequestTypeDef,
    UpdateChannelNamespaceRequestTypeDef,
    AuthModeTypeDef,
)

from program.components.dynamic.aws.appsync.base import AppsyncBase
from utils import tags


class ChannelNamespaceProviderInputs(TypedDict):
    tenant_id: str
    api_id: str
    name: str
    subscribe_auth_modes: NotRequired[Sequence[AuthModeTypeDef]]
    publish_auth_modes: NotRequired[Sequence[AuthModeTypeDef]]
    code_handlers: NotRequired[str]


class ChannelNamespaceProviderOutputs(TypedDict):
    tenant_id: str
    api_id: str
    name: str
    channel_namespace_arn: str
    created: str
    last_modified: str
    subscribe_auth_modes: NotRequired[List[AuthModeTypeDef]]
    publish_auth_modes: NotRequired[List[AuthModeTypeDef]]
    code_handlers: NotRequired[str]
    tags: NotRequired[Dict[str, str]]


class ChannelNamespaceProvider(pulumi.dynamic.ResourceProvider, AppsyncBase):
    @staticmethod
    def __build_outs(
        tenant_id: str,
        **channel_namespace: Unpack[ChannelNamespaceTypeDef],
    ) -> ChannelNamespaceProviderOutputs:
        outs: ChannelNamespaceProviderOutputs = {
            "tenant_id": tenant_id,
            "api_id": channel_namespace["apiId"],
            "name": channel_namespace["name"],
            "channel_namespace_arn": channel_namespace["channelNamespaceArn"],
            "created": channel_namespace["created"].isoformat(),
            "last_modified": channel_namespace["lastModified"].isoformat(),
        }

        if channel_namespace.get("subscribeAuthModes") is not None:
            outs["subscribe_auth_modes"] = list(channel_namespace["subscribeAuthModes"])
        if channel_namespace.get("publishAuthModes") is not None:
            outs["publish_auth_modes"] = list(channel_namespace["publishAuthModes"])
        if channel_namespace.get("codeHandlers") is not None:
            outs["code_handlers"] = channel_namespace["codeHandlers"]
        if channel_namespace.get("tags") is not None:
            outs["tags"] = channel_namespace["tags"]

        return outs

    def create(
        self, props: ChannelNamespaceProviderInputs
    ) -> pulumi.dynamic.CreateResult:
        create_input: CreateChannelNamespaceRequestTypeDef = {
            "apiId": props["api_id"],
            "name": props["name"],
            "tags": tags(props["tenant_id"]),
        }

        if props.get("subscribe_auth_modes") is not None:
            create_input["subscribeAuthModes"] = props["subscribe_auth_modes"]
        if props.get("publish_auth_modes") is not None:
            create_input["publishAuthModes"] = props["publish_auth_modes"]
        if props.get("code_handlers") is not None:
            create_input["codeHandlers"] = props["code_handlers"]

        channel_namespace = (
            ChannelNamespaceProvider._get_client().create_channel_namespace(
                **create_input
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception("Failed to create channel namespace")

        return pulumi.dynamic.CreateResult(
            id_=channel_namespace["name"],
            outs=dict(ChannelNamespaceProvider.__build_outs(
                props["tenant_id"],
                **channel_namespace,
            )),
        )

    def read(
        self, id_: str, props: ChannelNamespaceProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        channel_namespace = (
            ChannelNamespaceProvider._get_client().get_channel_namespace(
                apiId=props["api_id"], name=props["name"]
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception(f"Failed reading channel namespace \"{id_}\"")

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs=dict(ChannelNamespaceProvider.__build_outs(
                props["tenant_id"],
                **channel_namespace,
            )),
        )

    def update(
        self,
        _id: str,
        _olds: ChannelNamespaceProviderOutputs,
        _news: ChannelNamespaceProviderInputs,
    ) -> pulumi.dynamic.UpdateResult:
        update_input: UpdateChannelNamespaceRequestTypeDef = {
            "apiId": _olds["api_id"],
            "name": _id,
        }

        if _news.get("subscribe_auth_modes") is not None:
            update_input["subscribeAuthModes"] = _news["subscribe_auth_modes"]
        if _news.get("publish_auth_modes") is not None:
            update_input["publishAuthModes"] = _news["publish_auth_modes"]
        if _news.get("code_handlers") is not None:
            update_input["codeHandlers"] = _news["code_handlers"]

        channel_namespace = (
            ChannelNamespaceProvider._get_client().update_channel_namespace(
                **update_input
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception(f"Failed updating channel namespace \"{_id}\"")

        return pulumi.dynamic.UpdateResult(
            outs=dict(ChannelNamespaceProvider.__build_outs(
                _olds["tenant_id"],
                **channel_namespace,
            )),
        )

    def delete(self, _id: str, _props: ChannelNamespaceProviderOutputs) -> None:
        ChannelNamespaceProvider._get_client().delete_channel_namespace(
            apiId=_props["api_id"], name=_id
        )
