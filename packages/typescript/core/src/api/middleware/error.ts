import * as Cause from "effect/Cause";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

export class UnexpectedServerError extends Schema.Class<UnexpectedServerError>(
  "UnexpectedServerError",
)(
  {
    message: Schema.Literal("unexpected server error").pipe(
      Schema.withConstructorDefault(Effect.succeed("unexpected server error")),
    ),
    ref: Schema.TemplateLiteral(["err_", Schema.String]),
  },
  { httpApiStatus: 500 },
) {}

export class ErrorMiddleware extends HttpApiMiddleware.Service<ErrorMiddleware>()(
  "@printdesk/core/api/ErrorMiddleware",
  { error: UnexpectedServerError },
) {
  public static readonly make = Crypto.Crypto.pipe(
    Effect.map((crypto) =>
      this.of((httpEffect) =>
        httpEffect.pipe(
          Effect.tapCauseIf(Cause.hasFails, Effect.logError),
          Effect.catchDefect((defect) =>
            crypto.randomUUIDv4.pipe(
              Effect.orDie,
              Effect.map(String.slice(0, 8)),
              Effect.map((id) => `err_${id}` as const),
              Effect.tap((ref) => Effect.logError(Cause.die(defect), ref)),
              Effect.flatMap((ref) => Effect.fail(new UnexpectedServerError({ ref }))),
            ),
          ),
        ),
      ),
    ),
  );

  public static readonly layer = this.make.pipe(Layer.effect(this));
}
