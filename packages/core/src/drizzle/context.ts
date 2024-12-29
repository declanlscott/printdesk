import { db } from ".";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { ApplicationError, DatabaseError } from "../utils/errors";

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export type TxOrDb = Transaction | typeof db;

export type TransactionContext<
  TEffect extends () => ReturnType<TEffect> = () => unknown,
> = {
  tx: Transaction;
  effects: Array<TEffect>;
};

export const TransactionContext =
  Utils.createContext<TransactionContext>("Transaction");

export async function useTransaction<
  TCallback extends (tx: TxOrDb) => ReturnType<TCallback>,
>(callback: TCallback) {
  try {
    const { tx } = TransactionContext.use();

    return callback(tx);
  } catch {
    return callback(db);
  }
}

export async function afterTransaction<
  TEffect extends () => ReturnType<TEffect>,
>(effect: TEffect) {
  try {
    const { effects } = TransactionContext.use();

    effects.push(effect);
  } catch {
    await Promise.resolve(effect);
  }
}

export async function createTransaction<TOutput>(
  callback: (tx: Transaction) => Promise<TOutput>,
) {
  for (let i = 0; i < Constants.DB_TRANSACTION_MAX_RETRIES; i++) {
    const result = await transact({
      transact: callback,
      rollback: (e) => {
        if (shouldRetryTransaction(e)) {
          console.log(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Retrying transaction due to error ${e} - attempt number ${i}`,
          );

          return false;
        }

        return true;
      },
    });

    if (result.status === "error") {
      if (result.shouldRethrow) throw result.error;

      continue;
    }

    return result.output;
  }

  throw new DatabaseError.MaximumTransactionRetriesExceeded();
}

type Result<TOutput> =
  | { status: "success"; output: TOutput }
  | { status: "error"; error: unknown; shouldRethrow: boolean };

async function transact<
  TOutput,
  TRollback extends (e: unknown) => boolean | Promise<boolean>,
>(callbacks: {
  transact: (tx: Transaction) => Promise<TOutput>;
  rollback?: TRollback;
}): Promise<Result<TOutput>> {
  try {
    const output = await callbacks.transact(TransactionContext.use().tx);

    return { status: "success", output };
  } catch (error) {
    if (error instanceof ApplicationError.MissingContext) {
      const effects: TransactionContext["effects"] = [];

      try {
        const output = await db.transaction(async (tx) =>
          TransactionContext.with({ tx, effects }, () =>
            callbacks.transact(tx),
          ),
        );

        await Promise.all(effects.map((effect) => effect()));

        return { status: "success", output };
      } catch (error) {
        console.error(error);

        if (!callbacks.rollback)
          return { status: "error", error, shouldRethrow: true };

        const shouldRethrow = await Promise.resolve(callbacks.rollback(error));

        return { status: "error", error, shouldRethrow };
      }
    }

    return { status: "error", error, shouldRethrow: true };
  }
}

/**
 * Check error code to determine if we should retry a transaction.
 * Because Aurora DSQL uses REPEATABLE READ isolation level, we need to be prepared to retry transactions.
 *
 * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and, https://www.postgresql.org/docs/10/errcodes-appendix.html and
 * https://stackoverflow.com/a/16409293/749644
 */
function shouldRetryTransaction(error: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const code = typeof error === "object" ? String((error as any).code) : null;

  return (
    code === Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
    code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE
  );
}
