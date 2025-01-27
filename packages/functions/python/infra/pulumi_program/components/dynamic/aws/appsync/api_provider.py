import pulumi
import boto3
from datetime import datetime


from typing import TypedDict, NotRequired, Mapping, Dict
from types_boto3_appsync import AppSyncClient
from types_boto3_appsync.type_defs import EventConfigTypeDef, EventConfigOutputTypeDef

from utilities import region
from utilities.aws import get_pulumi_credentials
from ...naming import logical_name, physical_name


class ApiProviderInputs(TypedDict):
    name: NotRequired[str]
    ownerContact: NotRequired[str]
    tags: NotRequired[Mapping[str, str]]
    eventConfig: NotRequired[EventConfigTypeDef]


class ApiProviderOutputs(TypedDict):
    apiId: str
    name: str
    ownerContact: str
    tags: Dict[str, str]
    dns: Dict[str, str]
    apiArn: str
    created: datetime
    xrayEnabled: bool
    wafWebAclArn: str
    eventConfig: EventConfigOutputTypeDef


class ApiProvider(pulumi.dynamic.ResourceProvider):
    def __init__(self, name: str):
        super().__init__()

        self.__logical_name = logical_name(name)

    @staticmethod
    def __get_client() -> AppSyncClient:
        credentials = get_pulumi_credentials("InfraFunctionAppsyncApiProvider")

        return boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=region,
        ).client("appsync")

    def create(self, props: ApiProviderInputs) -> pulumi.dynamic.CreateResult:
        client = ApiProvider.__get_client()

        api = client.create_api(
            name=physical_name(50, self.__logical_name),
            ownerContact=props["ownerContact"],
            tags=props["tags"],
            eventConfig=props["eventConfig"],
        )["api"]
        if "apiId" not in api:
            raise Exception(f"Failed creating api '{self.__logical_name}'")

        return pulumi.dynamic.CreateResult(id_=api["apiId"], outs=api)

    def read(self, id_: str, props: ApiProviderOutputs) -> pulumi.dynamic.ReadResult:
        client = ApiProvider.__get_client()

        api = client.get_api(apiId=id_)["api"]
        if "apiId" not in api:
            raise Exception(f"Failed reading api '{id_}'")

        return pulumi.dynamic.ReadResult(id_=id_, outs=api)

    def update(
        self,
        _id: str,
        _olds: ApiProviderOutputs,
        _news: ApiProviderInputs,
    ) -> pulumi.dynamic.UpdateResult:
        client = ApiProvider.__get_client()

        api = client.update_api(
            apiId=_id,
            name=_olds["name"],
            ownerContact=_news["ownerContact"],
            eventConfig=_news["eventConfig"],
        )["api"]
        if "apiId" not in api:
            raise Exception(f"Failed updating api '{_id}'")

        return pulumi.dynamic.UpdateResult(outs=api)

    def delete(self, _id: str, _props: ApiProviderOutputs) -> None:
        client = ApiProvider.__get_client()

        client.delete_api(apiId=_id)
