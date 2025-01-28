import pulumi
import boto3

from utilities import region
from utilities.aws import get_pulumi_credentials
from ...naming import logical_name, physical_name

from typing import TypedDict, NotRequired, Mapping, Dict, Any
from types_boto3_appsync import AppSyncClient
from types_boto3_appsync.type_defs import EventConfigTypeDef, ApiTypeDef


class EventApiProviderInputs(TypedDict):
    tenant_id: str
    owner_contact: NotRequired[str]
    tags: NotRequired[Mapping[str, str]]
    event_config: NotRequired[EventConfigTypeDef]


class EventApiProviderOutputs(TypedDict):
    tenant_id: str
    api_id: str
    name: str
    owner_contact: str
    tags: Dict[str, str]
    dns: Dict[str, str]
    api_arn: str
    created: str
    xray_enabled: bool
    waf_web_acl_arn: str
    event_config: Dict[str, Any]


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
            region_name=region,
        ).client("appsync")

    @staticmethod
    def __build_outs(tenant_id: str, api: ApiTypeDef) -> EventApiProviderOutputs:
        return {
            "tenant_id": tenant_id,
            "api_id": api["apiId"],
            "name": api["name"],
            "owner_contact": api["ownerContact"],
            "tags": api["tags"],
            "dns": api["dns"],
            "api_arn": api["apiArn"],
            "created": api["created"].isoformat(),
            "xray_enabled": api.get("xrayEnabled", False),
            "waf_web_acl_arn": api.get("wafWebAclArn", ""),
            "event_config": api["eventConfig"],
        }

    def create(self, props: EventApiProviderInputs) -> pulumi.dynamic.CreateResult:
        client = EventApiProvider.__get_client()

        api = client.create_api(
            name=physical_name(50, self.__logical_name, props["tenant_id"]),
            ownerContact=props.get("owner_contact", ""),
            tags=props.get("tags", {}),
            eventConfig=props.get("event_config"),
        )["api"]
        if "apiId" not in api:
            raise Exception(f"Failed creating event api '{self.__logical_name}'")

        return pulumi.dynamic.CreateResult(
            id_=api["apiId"],
            outs=EventApiProvider.__build_outs(props["tenant_id"], api),
        )

    def read(
        self, id_: str, props: EventApiProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        client = EventApiProvider.__get_client()

        api = client.get_api(apiId=id_)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed reading event api '{id_}'")

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs=EventApiProvider.__build_outs(props["tenant_id"], api),
        )

    def update(
        self,
        _id: str,
        _olds: EventApiProviderOutputs,
        _news: EventApiProviderInputs,
    ) -> pulumi.dynamic.UpdateResult:
        client = EventApiProvider.__get_client()

        api = client.update_api(
            apiId=_id,
            name=_olds["name"],
            ownerContact=_news.get("owner_contact", _olds["owner_contact"]),
            eventConfig=_news.get("event_config", _olds["event_config"]),
        )["api"]
        if "apiId" not in api:
            raise Exception(f"Failed updating event api '{_id}'")

        return pulumi.dynamic.UpdateResult(
            outs=EventApiProvider.__build_outs(_olds["tenant_id"], api),
        )

    def delete(self, _id: str, _props: EventApiProviderOutputs) -> None:
        client = EventApiProvider.__get_client()

        client.delete_api(apiId=_id)
