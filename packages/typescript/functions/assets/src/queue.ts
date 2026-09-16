import { Actor } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { AssetsContract } from "@printdesk/core/assets/contract";
import { NonEmptyString } from "@printdesk/core/utils";
import { TenantIdFromTemplate } from "@printdesk/core/utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { appLayer } from "./lib/app";

export const InvalidationNotification = Schema.Struct({
  account: NonEmptyString,
  action: Schema.Literal("PutObject"),
  bucket: NonEmptyString,
  object: Schema.Struct({
    key: NonEmptyString,
    size: Schema.ByteSizeFromNumber,
    eTag: Schema.String,
  }),
  eventTime: Schema.DateTimeUtcFromString,
});

export class CacheContextError extends Schema.TaggedError<CacheContextError>()(
  "CacheContextError",
  { cause: Schema.Defect() },
) {}

export class CachePurgeError extends Schema.TaggedError<CachePurgeError>()("CachePurgeError", {
  cause: Schema.Defect(),
}) {}

export const runtime = appLayer.pipe(ManagedRuntime.make);

export const queue = ((batch, _env, ctx) =>
  Effect.succeed(ctx.cache).pipe(
    Effect.filterOrFail(
      Predicate.isNotUndefined,
      () => new CacheContextError({ cause: new Error("undefined cache context") }),
    ),
    Effect.flatMap((cache) =>
      Effect.forEach(
        batch.messages,
        Effect.fn(function* (message) {
          const { bucket, object } = yield* Schema.decodeEffect(InvalidationNotification)(
            message.body,
          );

          return yield* Effect.succeed(object.key).pipe(
            Effect.flatMap(Schema.decodeEffect(AssetsContract.CacheSyntheticUrlFromKey)),
            Effect.flatMap(Schema.encodeEffect(AssetsContract.CacheSyntheticUrlFromHashTag)),
            Effect.provideServiceEffect(
              Actor,
              Effect.succeed(bucket).pipe(
                Effect.flatMap(Schema.decodeEffect(TenantIdFromTemplate)),
                Effect.map((id) => new ActorsContract.TenantActor({ id }).wrap),
              ),
            ),
            Effect.flatMap((hashTag) =>
              Effect.tryPromise({
                try: () => cache.purge({ tags: [hashTag] }),
                catch: (error) => new CachePurgeError({ cause: error }),
              }),
            ),
            Effect.filterOrFail(
              Struct.get("success"),
              (result) => new CachePurgeError({ cause: result.errors }),
            ),
            Effect.andThen(Effect.sync(() => message.ack())),
            Effect.catchCause(
              Effect.fn((cause) =>
                Effect.logError(
                  `Message "${message.id}" processing attempt #${message.attempts} failed:`,
                  cause.pipe(Cause.pretty),
                ).pipe(Effect.andThen(Effect.sync(() => message.retry()))),
              ),
            ),
          );
        }),
        { concurrency: "unbounded", discard: true },
      ),
    ),
    Effect.andThen(Effect.sync(() => batch.ackAll())),
    Effect.catchCause((cause) =>
      Effect.logError("Batch processing failed:", cause.pipe(Cause.pretty)).pipe(
        Effect.andThen(Effect.sync(() => batch.retryAll())),
      ),
    ),
    runtime.runPromise,
  )) satisfies ExportedHandlerQueueHandler<Env, typeof InvalidationNotification.Encoded>;
