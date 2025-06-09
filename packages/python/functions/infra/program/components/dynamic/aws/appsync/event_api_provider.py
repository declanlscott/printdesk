from typing import TypedDict, NotRequired, Dict, Unpack

import pulumi
from types_boto3_appsync.type_defs import (
    ApiTypeDef,
    CreateApiRequestTypeDef,
    EventConfigTypeDef,
    EventConfigOutputTypeDef,
    UpdateApiRequestTypeDef,
)

from utils import tags, naming
from program.components.dynamic.aws.appsync.base import AppsyncBase


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
    event_config: NotRequired[EventConfigOutputTypeDef]
    name: str
    tags: NotRequired[Dict[str, str]]
    owner_contact: NotRequired[str]
    xray_enabled: NotRequired[bool]
    waf_web_acl_arn: NotRequired[str]


class EventApiProvider(pulumi.dynamic.ResourceProvider, AppsyncBase):
    def __init__(self, name: str):
        super().__init__()

        self.__logical_name = naming.logical_name(name)

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
            "name": naming.physical_name(50, self.__logical_name, props["tenant_id"]),
            "tags": tags(props["tenant_id"]),
        }

        if props.get("owner_contact") is not None:
            create_input["ownerContact"] = props["owner_contact"]
        if props.get("event_config") is not None:
            create_input["eventConfig"] = props["event_config"]

        api = EventApiProvider._get_client().create_api(**create_input)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed creating event api '{self.__logical_name}'")

        return pulumi.dynamic.CreateResult(
            id_=api["apiId"],
            outs=dict(EventApiProvider.__build_outs(props["tenant_id"], **api)),
        )

    def read(
        self, id_: str, props: EventApiProviderOutputs
    ) -> pulumi.dynamic.ReadResult:
        api = EventApiProvider._get_client().get_api(apiId=id_)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed reading event api '{id_}'")

        return pulumi.dynamic.ReadResult(
            id_=id_,
            outs=dict(EventApiProvider.__build_outs(props["tenant_id"], **api)),
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

        api = EventApiProvider._get_client().update_api(**update_input)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed updating event api '{_id}'")

        return pulumi.dynamic.UpdateResult(
            outs=dict(EventApiProvider.__build_outs(_olds["tenant_id"], **api)),
        )

    def delete(self, _id: str, _props: EventApiProviderOutputs) -> None:
        EventApiProvider._get_client().delete_api(apiId=_id)
