import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { ColumnsContract } from "../columns/contract";

export namespace ActorsContract {
  export class InvalidActorError extends Data.TaggedError("InvalidActorError")<{
    actorTag: Actor["properties"]["_tag"];
  }> {}

  export class Public extends Schema.TaggedClass<Public>("Public")(
    "Public",
    {},
  ) {}

  export class System extends Schema.TaggedClass<System>("System")("System", {
    tenantId: ColumnsContract.TenantId,
  }) {}

  export class User extends Schema.TaggedClass<User>("User")("User", {
    id: ColumnsContract.EntityId,
    tenantId: ColumnsContract.TenantId,
  }) {}

  export class Actor extends Schema.TaggedClass<Actor>("Actor")("Actor", {
    properties: Schema.Union(Public, System, User),
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
      if (this.properties._tag === "Public")
        return Effect.fail(
          new InvalidActorError({ actorTag: this.properties._tag }),
        );

      return Effect.succeed(this.properties);
    });
  }
}
