import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import * as Array from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ReplicacheClientGroupsRepository } from ".";
import { Database } from "../../../database";
import { Constants } from "../../../utils/constants";
import { replicacheClientGroups } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientGroup, ReplicacheClientGroupsTable } from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = replicacheClientGroups.table;

  const upsert = Effect.fn("Replicache.ClientGroupsRepository.upsert")(
    (value: InferInsertModel<ReplicacheClientGroupsTable>) =>
      db
        .useTransaction((tx) =>
          tx
            .insert(table)
            .values(value)
            .onConflictDoUpdate({
              target: [table.id, table.tenantId],
              set: {
                clientVersion: sql.raw(`EXCLUDED."${table.clientVersion.name}"`),
                clientViewVersion: sql.raw(
                  `COALESCE(EXCLUDED."${table.clientViewVersion.name}", NULL)`,
                ),
                updatedAt: sql.raw(`COALESCE(EXCLUDED."${table.updatedAt.name}", NOW())`),
              },
            })
            .returning(),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findByIdForUpdate = Effect.fn("Replicache.ClientGroupsRepository.findByIdForUpdate")(
    (id: ReplicacheClientGroup["id"], tenantId: ReplicacheClientGroup["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .for("update"),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const deleteExpired = DateTime.now.pipe(
    Effect.map(DateTime.subtractDuration(Constants.REPLICACHE_LIFETIME)),
    Effect.flatMap((expiredAt) =>
      db.useTransaction((tx) =>
        tx
          .delete(table)
          .where(
            inArray(
              table.id,
              tx
                .select({ id: table.id })
                .from(table)
                .where(lt(table.updatedAt, expiredAt))
                .orderBy(asc(table.updatedAt))
                .limit(Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT),
            ),
          )
          .returning(),
      ),
    ),
    Effect.withSpan("Replicache.ClientGroupsRepository.deleteExpired"),
  );

  return { upsert, findByIdForUpdate, deleteExpired } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheClientGroupsRepository));
