import pulumi
import boto3
from sst import Resource

from src.utilities import tags
from src.utilities.aws import get_pulumi_credentials
from ...naming import logical_name, physical_name

from typing import TypedDict, NotRequired, Dict, Any, Unpack
from types_boto3_appsync import AppSyncClient
from types_boto3_appsync.type_defs import (
    EventConfigTypeDef,
    ApiTypeDef,
    CreateApiRequestTypeDef,
    UpdateApiRequestTypeDef,
)


class EventApiProviderInputs(TypedDict):
    tenant_id: str
    owner_contact: NotRequired[str]
    event_config: NotRequired[EventConfigTypeDef]


class EventApiProviderOutputs(TypedDict):
    tenant_id: str
    api_arn: str
    api_id: str
    created: str
    dns: Dict[str, str]
    event_config: Dict[str, Any]
    name: str
    tags: NotRequired[Dict[str, str]]
    owner_contact: NotRequired[str]
    xray_enabled: NotRequired[bool]
    waf_web_acl_arn: NotRequired[str]


class EventApiProvider(pulumi.dynamic.ResourceProvider):
    def __init__(self, name: str):
        super().__init__()

        self.__logical_name = logical_name(name)

    @staticmethod
    def __get_client() -> AppSyncClient:
        credentials = get_pulumi_credentials("InfraFunctionAppsyncEventApiProvider")

        return boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=Resource.Aws.region,
        ).client("appsync")

    @staticmethod
    def __build_outs(
        tenant_id: str,
        **api: Unpack[ApiTypeDef],
    ) -> EventApiProviderOutputs:
        outs: EventApiProviderOutputs = {
            "tenant_id": tenant_id,
            "api_arn": api["apiArn"],
            "api_id": api["apiId"],
            "created": api["created"].isoformat(),
            "dns": api["dns"],
            "event_config": api["eventConfig"],
            "name": api["name"],
        }

        if api.get("tags") is not None:
            outs["tags"] = api["tags"]
        if api.get("ownerContact") is not None:
            outs["owner_contact"] = api["ownerContact"]
        if api.get("xrayEnabled") is not None:
            outs["xray_enabled"] = api["xrayEnabled"]
        if api.get("wafWebAclArn") is not None:
            outs["waf_web_acl_arn"] = api["wafWebAclArn"]

        return outs

    def create(self, props: EventApiProviderInputs) -> pulumi.dynamic.CreateResult:
        create_input: CreateApiRequestTypeDef = {
            "name": physical_name(50, self.__logical_name, props["tenant_id"]),
            "tags": tags(props["tenant_id"]),
        }

        if props.get("owner_contact") is not None:
            create_input["ownerContact"] = props["owner_contact"]
        if props.get("event_config") is not None:
            create_input["eventConfig"] = props["event_config"]

        api = EventApiProvider.__get_client().create_api(**create_input)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed creating event api '{self.__logical_name}'")

        return pulumi.dynamic.CreateResult(
            id_=api["apiId"],
            outs=EventApiProvider.__build_outs(props["tenant_id"], **api),
        )

    def read(
        self, id_: str, props: EventApiProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        api = EventApiProvider.__get_client().get_api(apiId=id_)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed reading event api '{id_}'")

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs=EventApiProvider.__build_outs(props["tenant_id"], **api),
        )

    def update(
        self,
        _id: str,
        _olds: EventApiProviderOutputs,
        _news: EventApiProviderInputs,
    ) -> pulumi.dynamic.UpdateResult:
        update_input: UpdateApiRequestTypeDef = {
            "apiId": _id,
            "name": _olds["name"],
        }

        if _news.get("owner_contact") is not None:
            update_input["ownerContact"] = _news["owner_contact"]
        if _news.get("event_config") is not None:
            update_input["eventConfig"] = _news["event_config"]

        api = EventApiProvider.__get_client().update_api(**update_input)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed updating event api '{_id}'")

        return pulumi.dynamic.UpdateResult(
            outs=EventApiProvider.__build_outs(_olds["tenant_id"], **api),
        )

    def delete(self, _id: str, _props: EventApiProviderOutputs) -> None:
        EventApiProvider.__get_client().delete_api(apiId=_id)
