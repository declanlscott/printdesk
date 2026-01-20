import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { UsersContract } from "../users/contract";

export namespace ActorsContract {
  export class PublicActor extends Schema.TaggedClass<PublicActor>(
    "PublicActor",
  )("PublicActor", {}) {}

  export class SystemActor extends Schema.TaggedClass<SystemActor>(
    "SystemActor",
  )("SystemActor", {
    tenantId: ColumnsContract.TenantId,
  }) {}

  export class UserActor extends Schema.TaggedClass<UserActor>("UserActor")(
    "UserActor",
    {
      id: ColumnsContract.EntityId,
      tenantId: ColumnsContract.TenantId,
      role: UsersContract.Role,
    },
  ) {}

  export class Actor extends Schema.TaggedClass<Actor>("Actor")("Actor", {
    properties: Schema.Union(PublicActor, SystemActor, UserActor),
  }) {
    assert = <TActorTag extends Actor["properties"]["_tag"]>(
      actorTag: TActorTag,
    ) =>
      Effect.suspend(() => {
        if (this.properties._tag !== actorTag)
          return Effect.fail(
            new ForbiddenActorError({ actor: this.properties._tag }),
          );

        return Effect.succeed(
          this.properties as Extract<Actor["properties"], { _tag: TActorTag }>,
        );
      });

    assertPrivate = Effect.suspend(() => {
      if (this.properties._tag === "PublicActor")
        return Effect.fail(
          new ForbiddenActorError({ actor: this.properties._tag }),
        );

      return Effect.succeed(this.properties);
    });
  }

  export class ForbiddenActorError extends Schema.TaggedError<ForbiddenActorError>(
    "ForbiddenActorError",
  )(
    "ForbiddenActorError",
    {
      actor: Schema.Literal(
        ...Array.map(Actor.fields.properties.members, Struct.get("_tag")),
      ),
    },
    HttpApiSchema.annotations({ statusCode: 403 }),
  ) {}
}
