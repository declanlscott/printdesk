import { inArray, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ReplicacheClientViewEntriesRepository } from ".";
import { Database } from "../../../database";
import { Constants } from "../../../utils/constants";
import { replicacheClientViewEntries } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientViewEntriesTable, ReplicacheClientViewEntry } from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = replicacheClientViewEntries.table;

  const upsertMany = Effect.fn("Replicache.ClientViewEntries.upsertMany")(
    (values: Array<InferInsertModel<ReplicacheClientViewEntriesTable>>) =>
      db.useTransaction((tx) =>
        tx
          .insert(table)
          .values(values)
          .onConflictDoUpdate({
            target: [table.clientGroupId, table.entity, table.entityId, table.tenantId],
            set: {
              entityVersion: sql`EXCLUDED.${table.entityVersion}`,
              clientViewVersion: sql`EXCLUDED.${table.clientViewVersion}`,
            },
          })
          .returning(),
      ),
  );

  const deleteByGroupIds = Effect.fn("Replicache.ClientViewEntries.deleteByGroupIds")(
    (clientGroupIds: ReadonlyArray<ReplicacheClientViewEntry["clientGroupId"]>) =>
      db.useTransaction((tx) =>
        tx
          .delete(table)
          .where(
            inArray(
              table.clientGroupId,
              tx
                .select({ id: table.clientGroupId })
                .from(table)
                .where(inArray(table.clientGroupId, clientGroupIds))
                .limit(Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT),
            ),
          )
          .returning(),
      ),
  );

  return { upsertMany, deleteByGroupIds } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheClientViewEntriesRepository));
