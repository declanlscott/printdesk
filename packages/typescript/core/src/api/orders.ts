import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { AssetsContract } from "../assets/contract";
import { OrderObjectMetadataContract, OrdersContract } from "../orders/contracts";
import { EntityId } from "../utils";
import { AwsCredentialIdentityProviderMiddleware } from "./middleware/aws";

export namespace Orders {
  export class Group extends HttpApiGroup.make("Orders")
    .add(
      HttpApiEndpoint.post("objectsUploadUrls", "/:orderId/objects/upload-urls", {
        params: { orderId: EntityId },
        payload: AssetsContract.PresignedUrlPayload,
        success: OrderObjectMetadataContract.PresignedUrlsSuccess,
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          OrdersContract.NotFoundError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("objectsDownloadUrls", "/:orderId/objects/download-urls", {
        params: { orderId: EntityId },
        payload: AssetsContract.PresignedUrlPayload,
        success: OrderObjectMetadataContract.PresignedUrlsSuccess,
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          OrdersContract.NotFoundError,
        ],
      }),
    )
    .middleware(AwsCredentialIdentityProviderMiddleware) {}

  export class Objects extends HttpApiGroup.make("OrderObjects")
    .add(
      HttpApiEndpoint.post("uploadUrl", "/:objectId/upload-url", {
        params: { objectId: EntityId },
        payload: AssetsContract.PresignedUrlPayload,
        success: AssetsContract.PresignedUrlSuccess,
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          OrderObjectMetadataContract.NotFoundError,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.get("object", "/:objectId", {
        params: { objectId: EntityId },
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          OrderObjectMetadataContract.NotFoundError,
        ],
      }),
    )
    .middleware(AwsCredentialIdentityProviderMiddleware)
    .prefix("/objects") {}

  export class Api extends HttpApi.make("OrdersApi").add(Group).add(Objects) {}
}
