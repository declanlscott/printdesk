import { Api } from "@printdesk/core/api";
import { OrderObjectMetadataContract, OrdersContract } from "@printdesk/core/orders/contracts";
import { OrderObjectsPresigner } from "@printdesk/core/orders/objects/presigner";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { orderObjectsPresignerLayer } from "../lib/orders";
import { authMiddlewareLayer } from "../middleware/auth";
import { r2CredentialIdentityProviderMiddlewareLayer } from "../middleware/aws";
import { errorMiddlewareLayer } from "../middleware/error";

export const baseOrdersGroupLayer = HttpApiBuilder.group(
  Api,
  "Orders",
  Effect.fn(function* (handlers) {
    const presigner = yield* OrderObjectsPresigner;

    return handlers
      .handle("objectsUploadUrls", ({ params, payload }) =>
        presigner.presignPutUrls(params.orderId, payload.expiresIn).pipe(
          Effect.catchTag(
            "NoSuchElementError",
            () => new OrdersContract.NotFoundError({ id: params.orderId }),
          ),
          orDieWhenUnrespondable,
        ),
      )
      .handle("objectsDownloadUrls", ({ params, payload }) =>
        presigner.presignGetUrls(params.orderId, payload.expiresIn).pipe(
          Effect.catchTag(
            "NoSuchElementError",
            () => new OrdersContract.NotFoundError({ id: params.orderId }),
          ),
          orDieWhenUnrespondable,
        ),
      );
  }),
);

export const baseOrderObjectsGroupLayer = HttpApiBuilder.group(
  Api,
  "OrderObjects",
  Effect.fn(function* (handlers) {
    const presigner = yield* OrderObjectsPresigner;

    return handlers
      .handle("uploadUrl", ({ params, payload }) =>
        presigner.presignPutUrl(params.objectId, payload.expiresIn).pipe(
          Effect.catchTag(
            "NoSuchElementError",
            () => new OrderObjectMetadataContract.NotFoundError({ id: params.objectId }),
          ),
          orDieWhenUnrespondable,
        ),
      )
      .handle("object", ({ params }) =>
        presigner.presignGetUrl(params.objectId, Duration.minutes(1)).pipe(
          Effect.map(({ url }) => HttpServerResponse.redirect(url)),
          Effect.catchTag(
            "NoSuchElementError",
            () => new OrderObjectMetadataContract.NotFoundError({ id: params.objectId }),
          ),
          orDieWhenUnrespondable,
        ),
      );
  }),
);

export const ordersGroupLayer = Layer.merge(baseOrdersGroupLayer, baseOrderObjectsGroupLayer).pipe(
  Layer.provide([
    authMiddlewareLayer,
    errorMiddlewareLayer,
    orderObjectsPresignerLayer,
    r2CredentialIdentityProviderMiddlewareLayer,
  ]),
);
