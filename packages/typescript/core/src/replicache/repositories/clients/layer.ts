import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ReplicacheClientsRepository } from ".";
import { Database } from "../../../database";
import { Constants } from "../../../utils/constants";
import { replicacheClientsTable } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClient } from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = replicacheClientsTable;

  const upsert = Effect.fn("Replicache.ClientsRepository.upsert")(
    (value: InferInsertModel<typeof table>) =>
      db
        .useTransaction((tx) =>
          tx
            .insert(table)
            .values(value)
            .onConflictDoUpdate({
              target: [table.id, table.tenantId],
              set: {
                lastMutationId: value.lastMutationId,
                version: value.version,
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

  const findByIdForUpdate = Effect.fn("Replicache.ClientsRepository.findByIdForUpdate")(
    (id: ReplicacheClient["id"], tenantId: ReplicacheClient["tenantId"]) =>
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

  const findSinceVersionByGroupId = Effect.fn(
    "Replicache.ClientsRepository.findSinceVersionByGroupId",
  )(
    (
      version: ReplicacheClient["version"],
      clientGroupId: ReplicacheClient["clientGroupId"],
      tenantId: ReplicacheClient["tenantId"],
    ) =>
      db.useTransaction((tx) =>
        tx
          .select()
          .from(table)
          .where(
            and(
              gt(table.version, version),
              eq(table.clientGroupId, clientGroupId),
              eq(table.tenantId, tenantId),
            ),
          ),
      ),
  );

  const deleteByGroupIds = Effect.fn("Replicache.ClientsRepository.deleteByGroupIds")(
    (clientGroupIds: ReadonlyArray<ReplicacheClient["clientGroupId"]>) =>
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
                .orderBy(asc(table.updatedAt))
                .limit(Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT),
            ),
          )
          .returning(),
      ),
  );

  return {
    upsert,
    findByIdForUpdate,
    findSinceVersionByGroupId,
    deleteByGroupIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheClientsRepository));
