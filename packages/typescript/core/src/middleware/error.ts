import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as String from "effect/String";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

export namespace ErrorMiddleware {
  export const middleware = HttpRouter.middleware(
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto;

      return (httpEffect) =>
        httpEffect.pipe(
          Effect.tapCauseIf(Predicate.not(Cause.hasDies), Effect.logError),
          Effect.catchDefect((defect) =>
            crypto.randomUUIDv4.pipe(
              Effect.orDie,
              Effect.map(String.slice(0, 8)),
              Effect.map((id) => `err_${id}` as const),
              Effect.tap((ref) => Effect.logError(Cause.die(defect), ref)),
              Effect.map((ref) =>
                HttpServerResponse.jsonUnsafe(
                  { message: "unexpected server error", ref },
                  { status: 500 },
                ),
              ),
            ),
          ),
        );
    }),
  );

  export const layer = middleware.layer;
}
