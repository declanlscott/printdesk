# SST: https://github.com/anomalyco/sst/blob/39e859aac46613f08d59110b6ef6f061154823dc/pkg/server/resource/aws-kv-routes-update.go

import json
import random
import time
from typing import TypedDict, Optional

import pulumi
import boto3
from types_boto3_sts import STSClient

from types_boto3_cloudfront_keyvaluestore import CloudFrontKeyValueStoreClient
from types_boto3_cloudfront_keyvaluestore.type_defs import (
    PutKeyRequestListItemTypeDef,
    DeleteKeyRequestListItemTypeDef,
)


MAX_RETRIES = 50
CHUNK_SIZE = 1_000
PRECONDITION_FAILED = "Pre-Condition failed"


class RoutesProviderInputs(TypedDict):
    tenant_id: str
    store_arn: str
    namespace: str
    route_namespace: str


class RoutesProviderOutputs(RoutesProviderInputs):
    pass


class RoutesProvider(pulumi.dynamic.ResourceProvider):
    def __init__(self):
        super().__init__()
        self._client: Optional[CloudFrontKeyValueStoreClient] = None

    def configure(self, req: pulumi.dynamic.ConfigureRequest):
        sts: STSClient = boto3.client("sts")

        region = req.config.require(key="aws:region")
        role = json.loads(req.config.require(key="aws:assumeRoles"))[0]

        credentials = sts.assume_role(
            RoleArn=role["roleArn"],
            RoleSessionName="InfraManager",
            ExternalId=role["externalId"],
        )["Credentials"]

        self._client = boto3.Session(
            aws_access_key_id=credentials["AccessKeyId"],
            aws_secret_access_key=credentials["SecretAccessKey"],
            aws_session_token=credentials["SessionToken"],
            region_name=region,
        ).client("cloudfront-keyvaluestore")

    def create(self, props: RoutesProviderInputs) -> pulumi.dynamic.CreateResult:
        key = self._key(namespace=props["namespace"])
        route = self._route(
            tenant_id=props["tenant_id"],
            namespace=props["route_namespace"],
        )

        for attempt in range(MAX_RETRIES):
            # get etag
            etag = self._get_etag(store_arn=props["store_arn"])

            try:
                # get routes
                routes, chunk_count = self._get(
                    store_arn=props["store_arn"],
                    key=key,
                )
            except Exception:
                # check etag to see if this happened b/c routes were updated in the meantime
                if self._get_etag(store_arn=props["store_arn"]) != etag:
                    _random_sleep()
                    continue
                raise

            # append route if it doesn't exist
            if route not in routes:
                routes.append(route)

            try:
                # set routes
                self._set(
                    store_arn=props["store_arn"],
                    etag=etag,
                    key=key,
                    routes=routes,
                    old_chunk_count=chunk_count,
                )
            except self._client.exceptions.ValidationException as e:
                if PRECONDITION_FAILED in str(e):
                    _random_sleep()
                    continue
                raise

            return pulumi.dynamic.CreateResult(
                id_=f"{props['store_arn']}:{key}",
                outs=dict(props),
            )

        raise RuntimeError(f"Create failed after {MAX_RETRIES} attempts.")

    def update(
        self, _id: str, _olds: RoutesProviderOutputs, _news: RoutesProviderInputs
    ) -> pulumi.dynamic.UpdateResult:
        # If store or router namespace changed, handle as a new create
        if (
            _news["store_arn"] != _olds["store_arn"]
            or _news["namespace"] != _olds["namespace"]
        ):
            # First, delete the old entry if it exists
            self.delete(_id=_id, _props=_olds)

            # Then create the new entry
            result = self.create(props=_news)

            return pulumi.dynamic.UpdateResult(
                outs=result.outs,
            )

        old_route = self._route(
            tenant_id=_olds["tenant_id"], namespace=_olds["route_namespace"]
        )
        route = self._route(
            tenant_id=_news["tenant_id"], namespace=_news["route_namespace"]
        )

        for _ in range(MAX_RETRIES):
            # get etag
            etag = self._get_etag(_news["store_arn"])

            try:
                # get routes
                key = self._key(_news["namespace"])
                routes, chunk_count = self._get(
                    store_arn=_news["store_arn"],
                    key=key,
                )
            except Exception:
                # check etag to see if this happened b/c routes were updated in the meantime
                if self._get_etag(_news["store_arn"]) != etag:
                    _random_sleep()
                    continue
                raise

            self._remove(routes=routes, route=old_route)

            if route not in routes:
                routes.append(route)

            try:
                self._set(
                    store_arn=_news["store_arn"],
                    etag=etag,
                    key=key,
                    routes=routes,
                    old_chunk_count=chunk_count,
                )
            except self._client.exceptions.ValidationException as e:
                if PRECONDITION_FAILED in str(e):
                    _random_sleep()
                    continue
                raise

            return pulumi.dynamic.UpdateResult(outs=dict(_news))

        raise RuntimeError(f"Update failed after {MAX_RETRIES} attempts.")

    def delete(self, _id: str, _props: RoutesProviderOutputs) -> None:
        key = self._key(_props["namespace"])

        for attempt in range(MAX_RETRIES):
            # get etag
            etag = self._get_etag(_props["store_arn"])

            try:
                # get routes
                routes, chunk_count = self._get(store_arn=_props["store_arn"], key=key)
            except Exception:
                # check etag to see if this happened b/c routes were updated in the meantime
                if self._get_etag(_props["store_arn"]) != etag:
                    _random_sleep()
                    continue
                raise

            # remove route
            self._remove(
                routes=routes,
                route=self._route(
                    tenant_id=_props["tenant_id"],
                    namespace=_props["route_namespace"],
                ),
            )

            try:
                if not routes:
                    deletes: list[DeleteKeyRequestListItemTypeDef] = [{"Key": key}]

                    # Add all chunk delete keys to delete
                    if chunk_count > 1:
                        for i in range(chunk_count):
                            deletes.append({"Key": f"{key}:{i}"})

                    # update
                    self._client.update_keys(
                        KvsARN=_props["store_arn"],
                        IfMatch=etag,
                        Deletes=deletes,
                    )
                else:
                    self._set(
                        store_arn=_props["store_arn"],
                        etag=etag,
                        key=key,
                        routes=routes,
                        old_chunk_count=chunk_count,
                    )
            except self._client.exceptions.ValidationException as e:
                if PRECONDITION_FAILED in str(e):
                    _random_sleep()
                    continue
                raise

            return

        raise RuntimeError(f"Delete failed after {MAX_RETRIES} attempts.")

    @staticmethod
    def _key(namespace: str):
        return f"{namespace}:routes"

    @staticmethod
    def _route(namespace: str, tenant_id: str):
        return f"bucket,{namespace},,/{tenant_id}"

    def _get_etag(self, store_arn: str):
        return self._client.describe_key_value_store(KvsARN=store_arn)["ETag"]

    def _get(self, store_arn: str, key: str) -> tuple[list[str], int]:
        chunk_count = 1

        try:
            routes_json = self._client.get_key(KvsARN=store_arn, Key=key)["Value"]
        except self._client.exceptions.ResourceNotFoundException:
            # Key not found, return empty routes
            return [], chunk_count

        # Check if the data is chunked by trying to parse a metadata object first
        try:
            metadata = json.loads(routes_json)
            if (
                isinstance(metadata, dict)
                and "parts" in metadata
                and metadata["parts"] > 1
            ):
                chunk_count = metadata["parts"]
        except (json.JSONDecodeError, AttributeError):
            pass

        if chunk_count > 1:
            # This is chunked data, we need to retrieve and concatenate all chunks
            routes_json = ""

            for i in range(chunk_count):
                try:
                    routes_json += self._client.get_key(
                        KvsARN=store_arn, Key=f"{key}:{i}"
                    )["Value"]
                except Exception as e:
                    raise ValueError(f"Failed to retrieve chunk {i}") from e

        # Parse routes array
        routes = json.loads(routes_json)
        if not isinstance(routes, list):
            raise ValueError("Expected a JSON array of routes")

        return routes, chunk_count

    def _set(
        self,
        store_arn: str,
        etag: str,
        key: str,
        routes: list[str],
        old_chunk_count: int,
    ):
        chunk_count = 1
        puts: list[PutKeyRequestListItemTypeDef] = []
        deletes: list[DeleteKeyRequestListItemTypeDef] = []

        # Build new routes
        routes_json = json.dumps(routes)

        # Check if the string is longer than CHUNK_SIZE
        if len(routes_json) > CHUNK_SIZE:
            # Calculate number of chunks needed
            chunk_count = (len(routes_json) + CHUNK_SIZE - 1) // CHUNK_SIZE

            # Create and store a metadata entry of the number of chunks
            puts.append({"Key": key, "Value": json.dumps({"parts": chunk_count})})

            # Split the routes into chunks
            for i in range(chunk_count):
                start = i * CHUNK_SIZE
                end = min(start + CHUNK_SIZE, len(routes_json))
                puts.append({"Key": f"{key}:{i}", "Value": routes_json[start:end]})
        else:
            # For smaller strings, store all routes using a single key
            puts.append({"Key": key, "Value": routes_json})

        # Delete excess chunks if there are fewer than previously
        if chunk_count < old_chunk_count:
            for i in range(chunk_count, old_chunk_count):
                deletes.append({"Key": f"{key}:{i}"})
            if chunk_count == 1:
                deletes.append({"Key": f"{key}:0"})

        # update
        self._client.update_keys(
            KvsARN=store_arn,
            IfMatch=etag,
            Puts=puts,
            Deletes=deletes,
        )

    @staticmethod
    def _remove(routes: list[str], route: str):
        routes[:] = [r for r in routes if r != route]


# sleep for a random time between 100 and 500ms
def _random_sleep():
    time.sleep((random.randint(100, 500)) / 1000)
