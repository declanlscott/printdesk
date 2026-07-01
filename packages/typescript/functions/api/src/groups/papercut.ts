import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { GraphLayerMap } from "@printdesk/core/graph";
import { Oauth } from "@printdesk/core/oauth";
import { PapercutApi } from "@printdesk/core/papercut/api";
import { PapercutSyncer } from "@printdesk/core/papercut/syncer";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { papercutApiLayer, papercutSyncerLayer } from "../lib/papercut";
import { authMiddleware } from "../middleware/auth";

export const basePapercutGroupLayer = HttpApiBuilder.group(
  Api,
  "Papercut",
  Effect.fn(function* (handlers) {
    const papercutApi = yield* PapercutApi;

    return handlers
      .handle(
        "health",
        Effect.fn("Api.Papercut.health")(() =>
          papercutApi.getTotalUsers.pipe(
            Effect.map(() => true),
            Effect.catchTags({
              HttpClientError: () => Effect.succeed(false),
              FaultError: () => Effect.succeed(false),
            }),
            Effect.catchFilter(
              Filter.make((error) =>
                HttpServerRespondable.isRespondable(error)
                  ? Result.fail(error)
                  : Result.succeed(error),
              ),
              Effect.die,
            ),
            Effect.map((healthy) => ({ healthy })),
            AccessControl.enforce(AccessControl.permissionPolicy("papercut_api_gateway:read")),
          ),
        ),
      )
      .handle(
        "taskStatus",
        Effect.fn("Api.Papercut.taskStatus")(() =>
          papercutApi.getTaskStatus.pipe(
            Effect.map((taskStatus) => ({
              completed: taskStatus[0].value.boolean,
              message: taskStatus[1].value,
            })),
            Effect.catchFilter(
              Filter.make((error) =>
                HttpServerRespondable.isRespondable(error)
                  ? Result.fail(error)
                  : Result.succeed(error),
              ),
              Effect.die,
            ),
            AccessControl.enforce(AccessControl.permissionPolicy("papercut_api_gateway:read")),
          ),
        ),
      );
  }),
);

export const papercutGroupLayer = basePapercutGroupLayer.pipe(
  Layer.provide([authMiddleware.layer, papercutApiLayer]),
  Layer.provide([ActorLayerMap.layer, Oauth.AccessTokenLayerMap.layer, openauthLayer]),
);

export const basePapercutSyncGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutSync",
  Effect.fn(function* (handlers) {
    const syncer = yield* PapercutSyncer;

    return handlers
      .handle("source", () =>
        syncer.syncSource.pipe(
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("all", () =>
        syncer.syncAll.pipe(
          Effect.provide(GraphLayerMap.layer),
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("customerGroups", () =>
        syncer.syncCustomerGroups.pipe(
          Effect.asVoid,
          Effect.provide(GraphLayerMap.layer),
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("customerGroupMemberships", () =>
        syncer.syncCustomerGroupMemberships.pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("sharedAccounts", () =>
        syncer.syncSharedAccounts.pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("sharedAccountCustomerAccess", () =>
        syncer.syncSharedAccountCustomerAccess.pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("sharedAccountCustomerGroupAccess", () =>
        syncer.syncSharedAccountCustomerGroupAccess.pipe(
          Effect.asVoid,
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      )
      .handle("users", () =>
        syncer.syncUsers.pipe(
          Effect.asVoid,
          Effect.provide(GraphLayerMap.layer),
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
        ),
      );
  }),
);

export const papercutSyncGroupLayer = basePapercutSyncGroupLayer.pipe(
  Layer.provide([authMiddleware.layer, papercutSyncerLayer]),
  Layer.provide([ActorLayerMap.layer, Oauth.AccessTokenLayerMap.layer, openauthLayer]),
);
