import { AccessControl } from "@printdesk/core/access-control";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { AwsCredentialIdentityProviderMiddleware } from "@printdesk/core/api/middleware/aws";
import { AssetsContract } from "@printdesk/core/assets/contract";
import { ImagesContract } from "@printdesk/core/images/contract";
import { NonEmptyString } from "@printdesk/core/utils";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

export namespace Images {
  export class Group extends HttpApiGroup.make("Images")
    .add(
      HttpApiEndpoint.get("image", "/:image", {
        params: { image: NonEmptyString },
        error: [
          AccessControl.AccessDeniedError,
          ActorsContract.ForbiddenActorError,
          HttpApiError.NotFound,
        ],
      }),
    )
    .add(
      HttpApiEndpoint.post("uploadUrl", "/:image/upload-url", {
        params: { image: NonEmptyString },
        payload: ImagesContract.PresignedUrlPayload,
        success: AssetsContract.PresignedUrlSuccess,
        error: [AccessControl.AccessDeniedError, ActorsContract.ForbiddenActorError],
      }),
    )
    .middleware(AwsCredentialIdentityProviderMiddleware) {}

  export class Api extends HttpApi.make("ImagesApi").add(Group) {}
}
