import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Layer from "effect/Layer";
import * as LayerMap from "effect/LayerMap";

import type { OauthContract } from "./contract";
import type { ServiceShape } from "./layer";

export namespace Oauth {
  export class Oauth extends Context.Service<Oauth, ServiceShape>()(
    "@printdesk/core/oauth/Oauth",
  ) {}

  // @effect-leakable-service
  export class AccessToken extends Context.Service<AccessToken, OauthContract.Tokens["access"]>()(
    "@printdesk/core/oauth/AccessToken",
  ) {
    public static readonly layer = (token: typeof AccessToken.Service) =>
      Layer.succeed(this, this.of(token));
  }

  export class AccessTokenLayerMap extends LayerMap.Service<AccessTokenLayerMap>()(
    "@printdesk/core/oauth/AccessTokenLayerMap",
    {
      idleTimeToLive: Duration.minutes(15),
      lookup: AccessToken.layer,
    },
  ) {}
}
