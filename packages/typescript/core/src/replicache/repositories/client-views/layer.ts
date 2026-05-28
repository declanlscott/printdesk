import { and, eq, inArray, max, sql } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Struct from "effect/Struct";

import { ReplicacheClientViewsRepository } from ".";
import { Database } from "../../../database";
import { Constants } from "../../../utils/constants";
import { replicacheClientViews } from "../../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { ReplicacheClientView, ReplicacheClientViewsTable } from "../../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = replicacheClientViews.table;

  const upsert = Effect.fn("Replicache.ClientViewsRepository.upsert")(
    (value: InferInsertModel<ReplicacheClientViewsTable>) =>
      db
        .useTransaction((tx) =>
          tx
            .insert(table)
            .values(value)
            .onConflictDoUpdate({
              target: [table.clientGroupId, table.version, table.tenantId],
              set: { clientVersion: sql.raw(`EXCLUDED."${table.clientVersion.name}"`) },
            })
            .returning(),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.catchTag("NoSuchElementError", Effect.die),
        ),
  );

  const findById = Effect.fn("Replicache.ClientViewsRepository.findById")(
    (
      clientGroupId: ReplicacheClientView["clientGroupId"],
      version: ReplicacheClientView["version"],
      tenantId: ReplicacheClientView["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(
              and(
                eq(table.clientGroupId, clientGroupId),
                eq(table.version, version),
                eq(table.tenantId, tenantId),
              ),
            ),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findMaxVersionByGroupId = Effect.fn(
    "Replicache.ClientViewsRepository.findMaxVersionByGroupId",
  )(
    (
      clientGroupId: ReplicacheClientView["clientGroupId"],
      tenantId: ReplicacheClientView["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .select({ version: max(table.version) })
            .from(table)
            .where(and(eq(table.clientGroupId, clientGroupId), eq(table.tenantId, tenantId))),
        )
        .pipe(
          Effect.map(Array.head),
          Effect.flatMap(Effect.fromOption),
          Effect.map(Struct.get("version")),
          Effect.filterOrFail(Predicate.isNotNull, () => new Cause.NoSuchElementError()),
        ),
  );

  const deleteByGroupIds = Effect.fn("Replicache.ClientViewsRepository.deleteByGroupIds")(
    (clientGroupIds: ReadonlyArray<ReplicacheClientView["clientGroupId"]>) =>
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

  return {
    upsert,
    findById,
    findMaxVersionByGroupId,
    deleteByGroupIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ReplicacheClientViewsRepository));
