import { OauthContract } from "@printdesk/core/oauth/contract";
import { Constants } from "@printdesk/core/utils/constants";
import * as Schema from "effect/Schema";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

import type { TenantSlug } from "@printdesk/core/tenants/slug";

export namespace AuthApi {
  export const login = HttpApiEndpoint.get("login", Constants.WEB_BFF_PATHS.login, {
    query: Schema.Struct({ redirectUri: Schema.URLFromString.pipe(Schema.optional) }).pipe(
      Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI }),
    ),
    error: [OauthContract.AuthorizeError],
  });

  export class TenantSlugValidator extends HttpApiMiddleware.Service<
    TenantSlugValidator,
    { provides: TenantSlug }
  >()("TenantSlugValidator", { error: HttpApiError.BadRequest }) {}

  export const oauthCallback = HttpApiEndpoint.get(
    "oauth-callback",
    Constants.WEB_BFF_PATHS.oauthCallback,
    {
      query: Schema.Struct({
        code: Schema.NonEmptyString,
        redirectUri: Schema.URLFromString,
      }).pipe(Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI })),
      error: [
        OauthContract.ExchangeError,
        OauthContract.InvalidAuthorizationCodeError,
        HttpApiError.InternalServerError,
      ],
    },
  );

  export class Group extends HttpApiGroup.make("auth")
    .add(login.middleware(TenantSlugValidator))
    .add(oauthCallback) {}
}
