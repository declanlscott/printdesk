import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import { ScimContract } from "../scim/contract";
import { EntityId } from "../utils";
import {
  ScimAuthMiddleware,
  ScimBulkIdMapMiddleware,
  ScimHttpApiSchemaErrorHandlerMiddleware,
  ScimLocatorMiddleware,
} from "./middleware/scim";

export namespace Scim {
  const contentType = HttpApiSchema.asJson({ contentType: "application/scim+json" });

  export class Root extends HttpApiGroup.make("ScimV2Root").add(
    HttpApiEndpoint.get("root", "/", { error: ScimContract.V2Error.pipe(contentType) }),
  ) {}

  export class ServiceProviderConfig extends HttpApiGroup.make("ScimV2ServiceProviderConfig")
    .add(
      HttpApiEndpoint.get("discover", "/", {
        success: ScimContract.V2ServiceProviderConfig.pipe(contentType),
      }),
    )
    .prefix("/ServiceProviderConfig") {}

  export class ResourceTypes extends HttpApiGroup.make("ScimV2ResourceTypes")
    .add(
      HttpApiEndpoint.get("discover", "/", {
        success: ScimContract.V2ListResponse.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.get("retrieve", "/:name", {
        params: { name: ScimContract.V2ResourceTypeName.pick(["User", "Group"]) },
        success: ScimContract.V2ResourceType.pipe(contentType),
      }),
    )
    .prefix("/ResourceTypes") {}

  export class Schemas extends HttpApiGroup.make("ScimV2Schemas")
    .add(HttpApiEndpoint.get("discover", "/", { success: ScimContract.V2ListResponse }))
    .add(
      HttpApiEndpoint.get("retrieve", "/:id", {
        params: { id: ScimContract.V2ResourceUri },
        success: ScimContract.V2Schema.pipe(contentType),
      }),
    )
    .prefix("/Schemas") {}

  export class Groups extends HttpApiGroup.make("ScimV2Groups")
    .add(
      HttpApiEndpoint.get("query", "/", {
        query: ScimContract.V2QueryParams,
        success: ScimContract.V2ListResponse.GroupsToDtos.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.get("retrieve", "/:id", {
        params: { id: EntityId },
        success: ScimContract.V2Group.ToDtos.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.post("create", "/:id", {
        params: { id: EntityId },
        payload: ScimContract.V2Group.ProvisionalToDtos,
        success: ScimContract.V2Group.ToDtos.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.put("replace", "/:id", {
        params: { id: EntityId },
        payload: ScimContract.V2Group.ToDtos,
        success: ScimContract.V2Group.ToDtos.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.patch("modify", "/:id", {
        params: { id: EntityId },
        payload: ScimContract.V2Patch,
        success: ScimContract.V2Group.ToDtos.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.delete("delete", "/:id", {
        params: { id: EntityId },
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .prefix("/Groups") {}

  export class Users extends HttpApiGroup.make("ScimV2Users")
    .add(
      HttpApiEndpoint.get("query", "/", {
        query: ScimContract.V2QueryParams,
        success: ScimContract.V2ListResponse.UsersToDtos.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.get("retrieve", "/:id", {
        params: { id: EntityId },
        success: ScimContract.V2User.ToDto.pipe(contentType, HttpApiSchema.status(200)),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.post("create", "/", {
        payload: ScimContract.V2User.ProvisionalToDto,
        success: ScimContract.V2User.ToDto.pipe(contentType, HttpApiSchema.status(201)),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.put("replace", "/:id", {
        params: { id: EntityId },
        payload: ScimContract.V2User.ToDto,
        success: ScimContract.V2User.ToDto.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.patch("modify", "/:id", {
        params: { id: EntityId },
        payload: ScimContract.V2Patch,
        success: ScimContract.V2User.ToDto.pipe(contentType),
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .add(
      HttpApiEndpoint.delete("delete", "/:id", {
        params: { id: EntityId },
        error: ScimContract.V2Error.pipe(contentType),
      }),
    )
    .prefix("/Users") {}

  export class Bulk extends HttpApiGroup.make("ScimV2Bulk").add(
    HttpApiEndpoint.post("create", "/", {
      payload: ScimContract.V2BulkRequest,
      success: ScimContract.V2BulkResponse.pipe(contentType),
      error: ScimContract.V2Error.pipe(contentType),
    }).middleware(ScimBulkIdMapMiddleware),
  ) {}

  export class V2Api extends HttpApi.make("ScimV2Api")
    .add(Groups)
    .add(Users)
    .add(Bulk)
    .middleware(ScimAuthMiddleware)
    .middleware(ScimLocatorMiddleware)
    .add(ServiceProviderConfig)
    .add(ResourceTypes)
    .add(Schemas)
    .middleware(ScimHttpApiSchemaErrorHandlerMiddleware)
    .add(Root)
    .prefix("/v2") {}

  export class Api extends HttpApi.make("ScimApi").addHttpApi(V2Api).prefix("/scim") {}
}
