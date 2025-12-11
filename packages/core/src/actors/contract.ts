import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns/contract";

export namespace ActorsContract {
  export class InvalidActorError extends Data.TaggedError("InvalidActorError")<{
    actorTag: Actor["properties"]["_tag"];
  }> {}

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
            new InvalidActorError({ actorTag: this.properties._tag }),
          );

        return Effect.succeed(
          this.properties as Extract<Actor["properties"], { _tag: TActorTag }>,
        );
      });

    assertPrivate = Effect.suspend(() => {
      if (this.properties._tag === "PublicActor")
        return Effect.fail(
          new InvalidActorError({ actorTag: this.properties._tag }),
        );

      return Effect.succeed(this.properties);
    });
  }
}
