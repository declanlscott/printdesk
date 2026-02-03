import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

import { ActorsContract } from "./contract";

import type * as Effect from "effect/Effect";

export namespace Actors {
  // @effect-leakable-service
  export class Actor extends Context.Tag("@printdesk/core/actors/Actor")<
    Actor,
    ActorsContract.Actor
  >() {
    static readonly layer = (
      properties: Effect.Effect.Success<typeof Actor>["properties"],
    ) => Layer.succeed(this, this.of(new ActorsContract.Actor({ properties })));
  }
}
