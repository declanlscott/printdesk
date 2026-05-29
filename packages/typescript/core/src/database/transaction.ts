import * as PgDrizzle from "drizzle-orm/effect-postgres";
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as SynchronizedRef from "effect/SynchronizedRef";

import type { PgEffectTransaction } from "drizzle-orm/pg-core/effect";

export interface TransactionAfterEffect {
  onSuccessOnly: boolean;
  effect: Effect.Effect<void>;
}

export class Transaction extends Context.Service<Transaction>()(
  "@printdesk/core/database/Transaction",
  {
    make: Effect.fn(function* (
      tx: PgEffectTransaction<PgDrizzle.EffectPgQueryEffectHKT, PgDrizzle.EffectPgQueryResultHKT>,
    ) {
      {
        const afterEffectsRef = yield* SynchronizedRef.make(Chunk.empty<TransactionAfterEffect>());

        yield* Effect.addFinalizer(
          Effect.fn("Database.Transaction.finalizer")((exit) =>
            afterEffectsRef.pipe(
              Ref.get,
              Effect.map(
                Chunk.filterMap(({ onSuccessOnly, effect }) =>
                  onSuccessOnly && exit.pipe(Predicate.not(Exit.isSuccess))
                    ? Result.failVoid
                    : Result.succeed(effect),
                ),
              ),
              Effect.flatMap((effects) =>
                Effect.all(effects, { concurrency: "unbounded", discard: true }),
              ),
            ),
          ),
        );

        const registerAfterEffect = (afterEffect: TransactionAfterEffect) =>
          afterEffectsRef.pipe(Ref.update(Chunk.append(afterEffect)));

        return { tx, registerAfterEffect } as const;
      }
    }),
  },
) {
  public static layer(...args: Parameters<typeof Transaction.make>) {
    return this.make(...args).pipe(Layer.effect(this));
  }
}
