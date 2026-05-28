import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { ClientsContract } from "../clients/contract";
import { UsersContract } from "../users/contract";
import { EntityId, TenantId } from "../utils";

export namespace ActorsContract {
  export class PublicActor extends Schema.TaggedClass<PublicActor>()("PublicActor", {}) {}
  export const publicActor = new PublicActor();

  export class ClientActor extends Schema.TaggedClass<ClientActor>()("ClientActor", {
    id: EntityId,
    tenantId: TenantId,
    role: ClientsContract.Role,
  }) {}

  export class UserActor extends Schema.TaggedClass<UserActor>()("UserActor", {
    id: EntityId,
    tenantId: TenantId,
    role: UsersContract.Role,
  }) {}

  export class Actor extends Schema.TaggedClass<Actor>()("Actor", {
    properties: Schema.Union([PublicActor, ClientActor, UserActor]),
  }) {
    #assert = <TActorTag extends Actor["properties"]["_tag"]>(actorTag: TActorTag) =>
      Effect.suspend(() => {
        if (this.properties._tag !== actorTag)
          return Effect.fail(new ForbiddenActorError({ actor: this.properties._tag }));

        return Effect.succeed(this.properties as Extract<Actor["properties"], { _tag: TActorTag }>);
      });

    public assertPublic = this.#assert("PublicActor");
    public assertClient = this.#assert("ClientActor");
    public assertUser = this.#assert("UserActor");

    public assertPrivate = Effect.suspend(() => {
      if (this.properties._tag === "PublicActor")
        return Effect.fail(new ForbiddenActorError({ actor: this.properties._tag }));

      return Effect.succeed(this.properties);
    });
  }

  export type PrivateActor = Effect.Success<typeof Actor.Type.assertPrivate>;

  export class ForbiddenActorError extends Schema.TaggedErrorClass<ForbiddenActorError>()(
    "ForbiddenActorError",
    {
      actor: Schema.Literals(
        Array.map(Actor.fields.properties.members, (member) => member.fields._tag.schema.literal),
      ),
    },
    { httpApiStatus: 403 },
  ) {}
}
