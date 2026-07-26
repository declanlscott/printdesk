import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { AccessControl } from "@printdesk/core/access-control";
import { ActorLayerMap } from "@printdesk/core/actors";
import { Api } from "@printdesk/core/api";
import {
  ScimAuthMiddleware,
  ScimBulkIdMapMiddleware,
  ScimLocatorMiddleware,
  ScimErrorMiddleware,
  ScimHttpApiSchemaErrorHandlerMiddleware,
} from "@printdesk/core/api/middleware/scim";
import { Oauth } from "@printdesk/core/oauth";
import { Scim } from "@printdesk/core/scim";
import { ScimContract } from "@printdesk/core/scim/contract";
import { orDieWhenUnrespondable } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";

import { openauthLayer } from "../lib/auth";
import { scimLayer, scimLocatorLayer } from "../lib/scim";

export const scimV2RootGroupLayer = HttpApiBuilder.group(Api, "ScimV2Root", (handlers) =>
  handlers.handle(
    "root",
    Effect.fn("Api.ScimV2Root.root")(() => new ScimContract.V2Error({ status: 404 })),
  ),
);

export const baseScimV2ServiceProviderConfigGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2ServiceProviderConfig",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers.handle(
      "discover",
      Effect.fn("Api.ScimV2ServiceProviderConfig.discover")(() =>
        scim.discoverServiceProviderConfig.pipe(Effect.orDie),
      ),
    );
  }),
);

export const scimV2ServiceProviderConfigGroupLayer = baseScimV2ServiceProviderConfigGroupLayer.pipe(
  Layer.provide([ScimHttpApiSchemaErrorHandlerMiddleware.layer, scimLayer]),
);

export const baseScimV2ResourceTypesGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2ResourceTypes",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers
      .handle(
        "discover",
        Effect.fn("Api.ScimV2ResourceTypes.discover")(() =>
          scim.discoverResourceTypes.pipe(Effect.flatMap(Struct.get("list")), Effect.orDie),
        ),
      )
      .handle(
        "retrieve",
        Effect.fn("Api.ScimV2ResourceTypes.retrieve")(({ params }) =>
          scim.retrieveResourceType(params.name).pipe(Effect.orDie),
        ),
      );
  }),
);

export const scimV2ResourceTypesGroupLayer = baseScimV2ResourceTypesGroupLayer.pipe(
  Layer.provide([ScimHttpApiSchemaErrorHandlerMiddleware.layer, scimLayer]),
);

export const baseScimV2SchemasGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2Schemas",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers
      .handle(
        "discover",
        Effect.fn("Api.ScimV2Schemas.discover")(() =>
          scim.discoverSchemas.pipe(Effect.flatMap(Struct.get("list")), Effect.orDie),
        ),
      )
      .handle(
        "retrieve",
        Effect.fn("Api.ScimV2Schemas.retrieve")(({ params }) =>
          scim.retrieveSchema(params.id).pipe(Effect.orDie),
        ),
      );
  }),
);

export const scimV2SchemasGroupLayer = baseScimV2SchemasGroupLayer.pipe(
  Layer.provide([ScimHttpApiSchemaErrorHandlerMiddleware.layer, scimLayer]),
);

export const baseScimV2GroupsGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2Groups",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers
      .handle(
        "query",
        Effect.fn("Api.ScimV2Groups.query")(({ query }) =>
          scim.queryGroups(query.filter).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("groups:read"),
                AccessControl.permissionPolicy("group_memberships:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "retrieve",
        Effect.fn("Api.ScimV2Groups.retrieve")(({ params }) =>
          scim.retrieveGroup(params.id).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("groups:read"),
                AccessControl.permissionPolicy("group_memberships:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "create",
        Effect.fn("Api.ScimV2Groups.create")(({ payload }) =>
          scim.createGroup(payload).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("groups:create"),
                AccessControl.permissionPolicy("group_memberships:create"),
                AccessControl.permissionPolicy("groups:read"),
                AccessControl.permissionPolicy("group_memberships:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "replace",
        Effect.fn("Api.ScimV2Groups.replace")(({ params, payload }) =>
          Effect.succeed(payload).pipe(
            Effect.filterOrFail(
              (payload) => payload.group.id === params.id,
              () =>
                new ScimContract.V2Error({
                  scimType: "mutability",
                  status: 409,
                  detail: "Attribute 'id' is readOnly`",
                }),
            ),
            Effect.flatMap(scim.replaceGroup),
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("groups:update"),
                AccessControl.permissionPolicy("group_memberships:update"),
                AccessControl.permissionPolicy("groups:read"),
                AccessControl.permissionPolicy("group_memberships:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "modify",
        Effect.fn("Api.ScimV2Groups.modify")(({ params, payload }) =>
          scim.modifyGroup(params.id, payload.Operations).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("groups:update"),
                AccessControl.permissionPolicy("group_memberships:update"),
                AccessControl.permissionPolicy("groups:read"),
                AccessControl.permissionPolicy("group_memberships:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "delete",
        Effect.fn("Api.ScimV2Groups.delete")(({ params }) =>
          scim.deleteGroup(params.id).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(AccessControl.permissionPolicy("groups:delete")),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      );
  }),
);

export const scimV2GroupsGroupLayer = baseScimV2GroupsGroupLayer.pipe(
  Layer.provide([
    ScimAuthMiddleware.layer,
    ScimLocatorMiddleware.layer,
    ScimHttpApiSchemaErrorHandlerMiddleware.layer,
    scimLayer,
  ]),
  Layer.provide([
    ActorLayerMap.layer,
    openauthLayer,
    Oauth.AccessTokenLayerMap.layer,
    scimLocatorLayer,
  ]),
);

export const baseScimV2UsersGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2Users",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers
      .handle(
        "query",
        Effect.fn("Api.ScimV2Users.query")(({ query }) =>
          scim.queryUsers(query.filter).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(AccessControl.permissionPolicy("users:read")),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "retrieve",
        Effect.fn("Api.ScimV2Users.retrieve")(({ params }) =>
          scim.retrieveUser(params.id).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(AccessControl.permissionPolicy("users:read")),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "create",
        Effect.fn("Api.ScimV2Users.create")(({ payload }) =>
          scim.createUser(payload).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("users:create"),
                AccessControl.permissionPolicy("users:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "replace",
        Effect.fn("Api.ScimV2Users.replace")(({ params, payload }) =>
          Effect.succeed(payload).pipe(
            Effect.filterOrFail(
              (payload) => payload.id === params.id,
              () =>
                new ScimContract.V2Error({
                  scimType: "mutability",
                  status: 400,
                  detail: "Attribute 'id' is readOnly`",
                }),
            ),
            Effect.flatMap(scim.replaceUser),
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("users:update"),
                AccessControl.permissionPolicy("users:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "modify",
        Effect.fn("Api.ScimV2Users.modify")(({ params, payload }) =>
          scim.modifyUser(params.id, payload.Operations).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(
              AccessControl.every(
                AccessControl.permissionPolicy("users:update"),
                AccessControl.permissionPolicy("users:read"),
              ),
            ),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      )
      .handle(
        "delete",
        Effect.fn("Api.ScimV2Users.delete")(({ params }) =>
          scim.deleteUser(params.id).pipe(
            orDieWhenUnrespondable,
            AccessControl.enforce(AccessControl.permissionPolicy("users:delete")),
            Effect.catchTags({
              ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
              AccessDeniedError: (error) =>
                new ScimContract.V2Error({ status: 403, detail: error.message }),
            }),
          ),
        ),
      );
  }),
);

export const scimV2UsersGroupLayer = baseScimV2UsersGroupLayer.pipe(
  Layer.provide([
    ScimAuthMiddleware.layer,
    ScimLocatorMiddleware.layer,
    ScimHttpApiSchemaErrorHandlerMiddleware.layer,
    scimLayer,
  ]),
  Layer.provide([
    ActorLayerMap.layer,
    openauthLayer,
    Oauth.AccessTokenLayerMap.layer,
    scimLocatorLayer,
  ]),
);

export const baseScimV2BulkGroupLayer = HttpApiBuilder.group(
  Api,
  "ScimV2Bulk",
  Effect.fn(function* (handlers) {
    const scim = yield* Scim;

    return handlers.handle(
      "create",
      Effect.fn("Api.ScimV2Bulk.create")(({ payload }) =>
        scim.bulkCreate(payload).pipe(
          orDieWhenUnrespondable,
          AccessControl.enforce(
            AccessControl.every(
              AccessControl.permissionPolicy("groups:create"),
              AccessControl.permissionPolicy("group_memberships:create"),
              AccessControl.permissionPolicy("users:create"),
            ),
          ),
          Effect.catchTags({
            ForbiddenActorError: () => new ScimContract.V2Error({ status: 403 }),
            AccessDeniedError: (error) =>
              new ScimContract.V2Error({ status: 403, detail: error.message }),
          }),
        ),
      ),
    );
  }),
);

export const scimV2BulkGroupLayer = baseScimV2BulkGroupLayer.pipe(
  Layer.provide([
    ScimAuthMiddleware.layer,
    ScimBulkIdMapMiddleware.layer,
    ScimLocatorMiddleware.layer,
    ScimHttpApiSchemaErrorHandlerMiddleware.layer,
    scimLayer,
  ]),
  Layer.provide([
    ActorLayerMap.layer,
    openauthLayer,
    Oauth.AccessTokenLayerMap.layer,
    scimLocatorLayer,
    NodeCrypto.layer,
  ]),
);

export const scimGroupsLayer = Layer.mergeAll(
  scimV2RootGroupLayer,
  scimV2ServiceProviderConfigGroupLayer,
  scimV2ResourceTypesGroupLayer,
  scimV2SchemasGroupLayer,
  scimV2GroupsGroupLayer,
  scimV2UsersGroupLayer,
  scimV2BulkGroupLayer,
).pipe(Layer.provide(ScimErrorMiddleware.layer), Layer.provide(NodeCrypto.layer));
