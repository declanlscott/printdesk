import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import * as Schema from "effect/Schema";

import { Actors } from ".";
import { CryptoContract } from "../auth/contracts";
import { Oauth } from "../auth/oauth";
import { DatabaseContract } from "../database/contract";

export namespace ActorsApi {
  export class Actor extends HttpApiMiddleware.Tag<Actor>()("Actor", {
    failure: Schema.Union(
      HttpApiError.HttpApiDecodeError,
      HttpApiError.Unauthorized,
      DatabaseContract.TransactionError,
      CryptoContract.KeyDerivationError,
      CryptoContract.KeyBufferError,
      CryptoContract.InvalidSecretError,
      CryptoContract.KeyVerificationError,
      Oauth.ClientError,
      Oauth.InvalidRefreshTokenError,
      Oauth.InvalidAccessTokenError,
    ),
    provides: Actors.Actor,
  }) {}
}
