import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { GraphLayerMap } from "@printdesk/core/graph";
import { authMiddleware } from "@printdesk/core/middleware/auth";
import { Oauth } from "@printdesk/core/oauth";
import { PapercutApi } from "@printdesk/core/papercut/api";
import { PapercutSyncer } from "@printdesk/core/papercut/syncer";
import { ReplicacheNotifier } from "@printdesk/core/replicache/notifier";
import { layer as replicacheNotifierLayer } from "@printdesk/core/replicache/notifier/layer";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { appsyncPublisherCredentialIdentityMiddlewareLayer } from "../lib/aws-credential-identity";
import { databaseLayer } from "../lib/database";
import { papercutApiLayer, papercutSyncerLayer } from "../lib/papercut";
import { realtimeLayer } from "../lib/realtime";

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
    const replicacheNotifier = yield* ReplicacheNotifier;

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
          Effect.map(Array.flatten),
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
      .handle("customerGroups", () =>
        syncer.syncCustomerGroups.pipe(
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
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
  Layer.provide([authMiddleware.layer, papercutSyncerLayer, replicacheNotifierLayer]),
  Layer.provide([
    ActorLayerMap.layer,
    databaseLayer,
    Oauth.AccessTokenLayerMap.layer,
    openauthLayer,
    realtimeLayer,
    appsyncPublisherCredentialIdentityMiddlewareLayer,
  ]),
);
