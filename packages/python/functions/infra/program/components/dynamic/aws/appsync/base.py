import boto3
from types_boto3_appsync import AppSyncClient
from sst import Resource

from utils import get_pulumi_credentials


class AppsyncBase:
    @staticmethod
    def _get_client() -> AppSyncClient:
        credentials = get_pulumi_credentials("InfraFunction")

        return boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=Resource.Aws.region,
        ).client("appsync")
