import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import * as Schema from "effect/Schema";

import { Credentials } from ".";
import { ActorsContract } from "../actors/contract";
import { CredentialsContract } from "./contract";

export namespace CredentialsApi {
  /**
   * NOTE: Requires actor middleware.
   */
  export class Identity extends HttpApiMiddleware.Tag<Identity>()("Identity", {
    failure: Schema.Union(
      CredentialsContract.ProviderError,
      ActorsContract.ForbiddenActorError,
    ),
    provides: Credentials.Identity,
  }) {}
}
