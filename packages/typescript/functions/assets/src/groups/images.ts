import { AccessControl } from "@printdesk/core/access-control";
import { ImagesFetcher } from "@printdesk/core/images/fetcher";
import { ImagesPresigner } from "@printdesk/core/images/presigner";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";

import { Assets } from "../contract";
import { imagesLayer } from "../lib/assets";
import { authMiddlewareLayer } from "../middleware/auth";
import { r2CredentialIdentityProviderMiddlewareLayer } from "../middleware/aws";
import { errorMiddlewareLayer } from "../middleware/error";

export const baseImagesGroupLayer = HttpApiBuilder.group(
  Assets,
  "Images",
  Effect.fn(function* (handlers) {
    const fetcher = yield* ImagesFetcher;
    const presigner = yield* ImagesPresigner;

    return handlers
      .handle("image", ({ params }) =>
        fetcher.fetchResponse(params.image).pipe(
          Effect.catchTag("NoSuchElementError", () => new HttpApiError.NotFound()),
          AccessControl.enforce(AccessControl.permissionPolicy("images:read")),
          orDieWhenUnrespondable,
        ),
      )
      .handle("uploadUrl", ({ params, payload }) =>
        presigner
          .presignPutUrl(params.image, payload)
          .pipe(
            AccessControl.enforce(AccessControl.permissionPolicy("images:create")),
            orDieWhenUnrespondable,
          ),
      );
  }),
);

export const imagesGroupLayer = baseImagesGroupLayer.pipe(
  Layer.provide([
    imagesLayer,
    authMiddlewareLayer,
    errorMiddlewareLayer,
    r2CredentialIdentityProviderMiddlewareLayer,
  ]),
);
