import pulumi
import boto3

from utilities import region, tags
from utilities.aws import get_pulumi_credentials

from typing import (
    TypedDict,
    NotRequired,
    List,
    Dict,
    Any,
    Unpack,
    Sequence,
)
from types_boto3_appsync.client import AppSyncClient
from types_boto3_appsync.type_defs import (
    ChannelNamespaceTypeDef,
    CreateChannelNamespaceRequestTypeDef,
    UpdateChannelNamespaceRequestTypeDef,
    AuthModeTypeDef,
)


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
    subscribe_auth_modes: NotRequired[List[Dict[str, Any]]]
    publish_auth_modes: NotRequired[List[Dict[str, Any]]]
    code_handlers: NotRequired[str]
    tags: NotRequired[Dict[str, str]]


class ChannelNamespaceProvider(pulumi.dynamic.ResourceProvider):
    @staticmethod
    def __get_client() -> AppSyncClient:
        credentials = get_pulumi_credentials(
            "InfraFunctionAppsyncChannelNamespaceProvider"
        )

        return boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=region,
        ).client("appsync")

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
            outs["tags"] = dict(channel_namespace["tags"])

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
            ChannelNamespaceProvider.__get_client().create_channel_namespace(
                **create_input
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception("Failed to create channel namespace")

        return pulumi.dynamic.CreateResult(
            id_=channel_namespace["name"],
            outs=ChannelNamespaceProvider.__build_outs(**channel_namespace),
        )

    def read(
        self, id_: str, props: ChannelNamespaceProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        channel_namespace = (
            ChannelNamespaceProvider.__get_client().get_channel_namespace(
                apiId=props["api_id"], name=props["name"]
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception("Failed to read channel namespace")

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs=ChannelNamespaceProvider.__build_outs(**channel_namespace),
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
            ChannelNamespaceProvider.__get_client().update_channel_namespace(
                **update_input
            )["channelNamespace"]
        )
        if "name" not in channel_namespace:
            raise Exception("Failed to update channel namespace")

        return pulumi.dynamic.UpdateResult(
            outs=ChannelNamespaceProvider.__build_outs(**channel_namespace),
        )

    def delete(self, _id: str, _props: ChannelNamespaceProviderOutputs) -> None:
        ChannelNamespaceProvider.__get_client().delete_channel_namespace(
            apiId=_props["api_id"], name=_id
        )
