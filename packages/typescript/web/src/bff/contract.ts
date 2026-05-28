import { OauthContract } from "@printdesk/core/oauth/contract";
import { Constants } from "@printdesk/core/utils/constants";
import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

export class Bff extends HttpApi.make("bff")
  .add(
    HttpApiGroup.make("auth")
      .add(
        HttpApiEndpoint.get("login", Constants.WEB_BFF_PATHS.login, {
          query: Schema.Struct({ redirectUri: Schema.URLFromString.pipe(Schema.optional) }).pipe(
            Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI }),
          ),
          error: [HttpApiError.InternalServerError],
        }),
      )
      .add(
        HttpApiEndpoint.get("oauth-callback", Constants.WEB_BFF_PATHS.oauthCallback, {
          query: Schema.Struct({
            code: Schema.NonEmptyString,
            redirectUri: Schema.URLFromString,
          }).pipe(Schema.encodeKeys({ redirectUri: Constants.URL_PARAM_NAMES.REDIRECT_URI })),
          error: [OauthContract.InvalidAuthorizationCodeError, HttpApiError.InternalServerError],
        }),
      ),
  )
  .add(
    HttpApiGroup.make("spa").add(
      HttpApiEndpoint.get("assets", "*", { error: [HttpApiError.InternalServerError] }),
    ),
  ) {}
