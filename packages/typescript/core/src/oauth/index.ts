import * as Context from "effect/Context";

import type { OauthContract } from "./contract";
import type { ServiceShape } from "./layer";

export namespace Oauth {
  export class Oauth extends Context.Service<Oauth, ServiceShape>()(
    "@printdesk/core/oauth/Oauth",
  ) {}

  // @effect-leakable-service
  export class AccessToken extends Context.Service<AccessToken, OauthContract.Tokens["access"]>()(
    "@printdesk/core/oauth/AccessToken",
  ) {}
}
