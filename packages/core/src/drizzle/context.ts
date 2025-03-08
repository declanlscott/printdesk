import { db } from ".";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { ApplicationError, DatabaseError } from "../utils/errors";

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export type TransactionContext<
  TEffect extends () => ReturnType<TEffect> = () => unknown,
> = {
  tx: Transaction;
  effects: Array<TEffect>;
};

export const TransactionContext = Utils.createContext<TransactionContext>(
  Constants.CONTEXT_NAMES.TRANSACTION,
);

export async function useTransaction<
  TCallback extends (tx: Transaction) => ReturnType<TCallback>,
>(callback: TCallback) {
  try {
    return callback(TransactionContext.use().tx);
  } catch (e) {
    if (
      e instanceof ApplicationError.MissingContext &&
      e.contextName === Constants.CONTEXT_NAMES.TRANSACTION
    )
      return createTransaction(callback);

    throw e;
  }
}

export async function afterTransaction<
  TEffect extends () => ReturnType<TEffect>,
>(effect: TEffect) {
  try {
    TransactionContext.use().effects.push(effect);
  } catch {
    await Promise.resolve(effect);
  }
}

export async function createTransaction<
  TCallback extends (tx: Transaction) => ReturnType<TCallback>,
>(callback: TCallback) {
  for (let i = 0; i < Constants.DB_TRANSACTION_MAX_RETRIES; i++) {
    const result = await transact(callback, (e) => {
      if (shouldRetryTransaction(e)) {
        console.log(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Retrying transaction due to error ${e} - attempt number ${i}`,
        );

        return false;
      }

      return true;
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
  TCallback extends (tx: Transaction) => ReturnType<TCallback>,
  TRollback extends (e: unknown) => boolean | Promise<boolean>,
>(
  callback: TCallback,
  rollback?: TRollback,
): Promise<Result<Awaited<ReturnType<TCallback>>>> {
  try {
    const output = await Promise.resolve(callback(TransactionContext.use().tx));

    return { status: "success", output };
  } catch (error) {
    if (error instanceof ApplicationError.MissingContext) {
      const effects: TransactionContext["effects"] = [];

      try {
        const output = await Promise.resolve(
          db.transaction(async (tx) =>
            TransactionContext.with({ tx, effects }, () => callback(tx)),
          ),
        );

        await Promise.all(effects.map((effect) => effect()));

        return { status: "success", output };
      } catch (error) {
        console.error(error);

        if (!rollback) return { status: "error", error, shouldRethrow: true };

        const shouldRethrow = await Promise.resolve(rollback(error));

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  const code = typeof error === "object" ? String((error as any).code) : null;

  return (
    code === Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
    code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE
  );
}
