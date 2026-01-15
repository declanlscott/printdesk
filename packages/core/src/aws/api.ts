import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";

import { Credentials } from ".";

export namespace CredentialsApi {
  /**
   * NOTE: Requires actor middleware.
   */
  export class Identity extends HttpApiMiddleware.Tag<Identity>()("Identity", {
    failure: HttpApiError.InternalServerError,
    provides: Credentials.Identity,
  }) {}
}
