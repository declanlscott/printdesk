import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { ClientsContract } from "../clients/contract";
import { UsersContract } from "../users/contract";
import { EntityId, TenantId } from "../utils";

export namespace ActorsContract {
  export interface Wrapper {
    get wrap(): Actor;
  }

  export class PublicActor
    extends Schema.TaggedClass<PublicActor>()("PublicActor", {})
    implements Wrapper
  {
    public static readonly singleton = new this();

    // oxlint-disable-next-line class-methods-use-this
    public get wrap() {
      return new Actor({ properties: PublicActor.singleton });
    }
  }

  export class ClientActor
    extends Schema.TaggedClass<ClientActor>()("ClientActor", {
      id: EntityId,
      tenantId: TenantId,
      role: ClientsContract.Role,
    })
    implements Wrapper
  {
    public get wrap() {
      return new Actor({ properties: new ClientActor(this) });
    }
  }

  export class UserActor
    extends Schema.TaggedClass<UserActor>()("UserActor", {
      id: EntityId,
      tenantId: TenantId,
      role: UsersContract.Role,
    })
    implements Wrapper
  {
    public get wrap() {
      return new Actor({ properties: new UserActor(this) });
    }
  }

  export class SystemActor
    extends Schema.TaggedClass<SystemActor>()("SystemActor", { tenantId: TenantId })
    implements Wrapper
  {
    public get wrap() {
      return new Actor({ properties: new SystemActor(this) });
    }
  }

  export class Actor extends Schema.TaggedClass<Actor>()("Actor", {
    properties: Schema.Union([PublicActor, ClientActor, UserActor, SystemActor]),
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
    public assertSystem = this.#assert("SystemActor");

    public assertPrivate = Match.value(this.properties).pipe(
      Match.tag("PublicActor", (actor) =>
        Effect.fail(new ForbiddenActorError({ actor: actor._tag })),
      ),
      Match.orElse((actor) => Effect.succeed(actor)),
    );

    public tenantId = this.assertPrivate.pipe(Effect.map(Struct.get("tenantId")));
  }

  export class ForbiddenActorError
    extends Schema.TaggedErrorClass<ForbiddenActorError>()(
      "ForbiddenActorError",
      {
        actor: Schema.Literals(
          Array.map(Actor.fields.properties.members, (member) => member.fields._tag.schema.literal),
        ),
      },
      { httpApiStatus: 403 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(ForbiddenActorError)(this, { status: 403 });
  }
}
