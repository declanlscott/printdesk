import { DatabaseError } from "pg";

import { db } from ".";
import { ServerErrors } from "../errors";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";

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

export const TransactionContext =
  Utils.createContext<TransactionContext>("Transaction");

export async function useTransaction<
  TCallback extends (tx: Transaction) => ReturnType<TCallback>,
>(callback: TCallback) {
  try {
    return callback(TransactionContext.use().tx);
  } catch (e) {
    if (TransactionContext.isMissing(e)) return createTransaction(callback);

    throw e;
  }
}

export async function afterTransaction<
  TEffect extends () => ReturnType<TEffect>,
>(effect: TEffect) {
  try {
    TransactionContext.use().effects.push(effect);
  } catch (e) {
    if (TransactionContext.isMissing(e)) await Promise.resolve(effect);

    throw e;
  }
}

async function createTransaction<
  TCallback extends (tx: Transaction) => ReturnType<TCallback>,
>(callback: TCallback) {
  for (let i = 0; i < Constants.DB_TRANSACTION_MAX_RETRIES; i++) {
    try {
      const effects: TransactionContext["effects"] = [];

      const output = await Promise.resolve(
        db.transaction(async (tx) =>
          TransactionContext.with(
            () => ({ tx, effects }),
            () => callback(tx),
          ),
        ),
      );

      await Promise.all(effects.map((effect) => effect()));

      return output;
    } catch (e) {
      console.error(e);

      if (shouldRetryTransaction(e)) {
        console.log(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Retrying transaction due to error ${e} - attempt number ${i}`,
        );

        continue;
      }

      throw e;
    }
  }

  throw new ServerErrors.DatabaseMaximumTransactionRetriesExceeded();
}

/**
 * Check error code to determine if we should retry a transaction.
 * Because Aurora DSQL uses REPEATABLE READ isolation level, we need to be prepared to retry transactions.
 *
 * See https://stackoverflow.com/questions/60339223/node-js-transaction-coflicts-in-postgresql-optimistic-concurrency-control-and,
 * https://www.postgresql.org/docs/10/errcodes-appendix.html, and
 * https://stackoverflow.com/a/16409293/749644
 */
const shouldRetryTransaction = <TError>(error: TError) =>
  error instanceof DatabaseError
    ? error.code === Constants.POSTGRES_SERIALIZATION_FAILURE_ERROR_CODE ||
      error.code === Constants.POSTGRES_DEADLOCK_DETECTED_ERROR_CODE
    : false;
