import * as Context from "effect/Context";

import type { ActorsContract } from "./contract";

export namespace Actors {
  export class Actor extends Context.Tag("@printdesk/core/actors/client/Actor")<
    Actor,
    ActorsContract.Actor
  >() {}
}
