import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";

import { Actors } from ".";

export namespace ActorsApi {
  export class Actor extends HttpApiMiddleware.Tag<Actor>()("Actor", {
    failure: HttpApiError.Unauthorized,
    provides: Actors.Actor,
  }) {}
}
