import * as Effect from "effect/Effect";
import * as Filter from "effect/Filter";
import * as Result from "effect/Result";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";

import type { ActorsContract } from "../../actors/contract";
import type {
  AwsCredentialIdentityProviderError,
  InvalidAwsCredentialIdentityError,
} from "../../aws/credential-identity";

export const awsCredentialIdentityErrorMiddleware = HttpRouter.middleware<{
  handles:
    | ActorsContract.ForbiddenActorError
    | AwsCredentialIdentityProviderError
    | InvalidAwsCredentialIdentityError;
}>()((httpEffect) =>
  httpEffect.pipe(
    Effect.catchFilter(
      Filter.make((error) =>
        HttpServerRespondable.isRespondable(error) ? Result.succeed(error) : Result.fail(error),
      ),
      HttpServerRespondable.toResponse,
    ),
  ),
);
