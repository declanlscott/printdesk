import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import { Graph } from "@printdesk/core/graph";
import { EntraId } from "@printdesk/core/identity/entra-id";
import { authMiddleware } from "@printdesk/core/middleware/auth";
import { Oauth } from "@printdesk/core/oauth";
import { PapercutMfApi } from "@printdesk/core/papercut-mf/api";
import { PapercutMfSyncer } from "@printdesk/core/papercut-mf/syncer";
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
import { appsyncPublisherCredentialIdentityProviderMiddlewareLayer } from "../lib/aws";
import { databaseLayer } from "../lib/database";
import { papercutMfApiLayer, papercutMfSyncerLayer } from "../lib/papercut";
import { realtimeLayer } from "../lib/realtime";

export const basePapercutMfGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutMf",
  Effect.fn(function* (handlers) {
    const api = yield* PapercutMfApi;

    return handlers
      .handle(
        "health",
        Effect.fn("Api.PapercutMf.health")(() =>
          api.getTotalUsers.pipe(
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
            AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_api_gateway:read")),
          ),
        ),
      )
      .handle(
        "taskStatus",
        Effect.fn("Api.PapercutMf.taskStatus")(() =>
          api.getTaskStatus.pipe(
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
            AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_api_gateway:read")),
          ),
        ),
      );
  }),
);

export const papercutMfGroupLayer = basePapercutMfGroupLayer.pipe(
  Layer.provide([authMiddleware.layer, papercutMfApiLayer]),
  Layer.provide([ActorLayerMap.layer, Oauth.AccessTokenLayerMap.layer, openauthLayer]),
);

export const basePapercutMfSyncGroupLayer = HttpApiBuilder.group(
  Api,
  "PapercutMfSync",
  Effect.fn(function* (handlers) {
    const syncer = yield* PapercutMfSyncer;
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
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.source"),
        ),
      )
      .handle("all", () =>
        syncer.syncAll.pipe(
          Effect.map(Array.flatten),
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
          Effect.asVoid,
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.all"),
        ),
      )
      .handle("customerGroups", () =>
        syncer.syncCustomerGroups.pipe(
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
          Effect.asVoid,
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.customerGroups"),
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
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.customerGroupMemberships"),
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
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.sharedAccounts"),
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
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.sharedAccountCustomerAccess"),
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
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.sharedAccountCustomerGroupAccess"),
        ),
      )
      .handle("users", () =>
        syncer.syncUsers.pipe(
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
          Effect.asVoid,
          Effect.catchTag("IdentityProviderNotImplementedError", Effect.die),
          Effect.catchFilter(
            Filter.make((error) =>
              HttpServerRespondable.isRespondable(error)
                ? Result.fail(error)
                : Result.succeed(error),
            ),
            Effect.die,
          ),
          AccessControl.enforce(AccessControl.permissionPolicy("papercut_mf_sync:create")),
          Effect.withSpan("Api.PapercutMfSync.users"),
        ),
      );
  }),
);

export const papercutMfSyncGroupLayer = basePapercutMfSyncGroupLayer.pipe(
  Layer.provide([authMiddleware.layer, papercutMfSyncerLayer, replicacheNotifierLayer]),
  Layer.provide([
    ActorLayerMap.layer,
    databaseLayer,
    EntraId.AuthProviderLayerMap.layer,
    Graph.layer,
    Oauth.AccessTokenLayerMap.layer,
    openauthLayer,
    realtimeLayer,
    appsyncPublisherCredentialIdentityProviderMiddlewareLayer,
  ]),
);
