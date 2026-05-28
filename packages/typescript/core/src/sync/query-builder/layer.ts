import { and, eq, gt, isNotNull, lte, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { SyncQueryBuilder } from ".";
import { Database } from "../../database";
import { replicacheClientViewEntries } from "../../replicache/sql";

import type { Models } from "../../models";
import type { ReplicacheClientView } from "../../replicache/sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = replicacheClientViewEntries.table;

  const creates = Effect.fn("Sync.QueryBuilder.creates")(
    <TEntity extends Models.SyncTableName>(entity: TEntity, clientView: ReplicacheClientView) =>
      db.useQueryBuilder((tx) =>
        tx
          .select({ id: table.entityId })
          .from(table)
          .where(
            and(
              eq(table.entity, entity),
              lte(table.clientViewVersion, clientView.clientVersion),
              eq(table.clientGroupId, clientView.clientGroupId),
              eq(table.tenantId, clientView.tenantId),
            ),
          )
          .$dynamic(),
      ),
  );

  const updates = Effect.fn("Sync.QueryBuilder.updates")(
    <TEntity extends Models.SyncTableName>(entity: TEntity, clientView: ReplicacheClientView) =>
      db.useQueryBuilder((tx) =>
        tx
          .select()
          .from(table)
          .where(
            and(
              eq(table.entity, entity),
              eq(table.clientGroupId, clientView.clientGroupId),
              eq(table.tenantId, clientView.tenantId),
            ),
          )
          .$dynamic(),
      ),
  );

  const deletes = Effect.fn("Sync.QueryBuilder.deletes")(
    <TEntity extends Models.SyncTableName>(entity: TEntity, clientView: ReplicacheClientView) =>
      db.useQueryBuilder((tx) =>
        tx
          .select({ id: table.entityId })
          .from(table)
          .where(
            and(
              eq(table.entity, entity),
              or(
                and(
                  lte(table.clientViewVersion, clientView.clientVersion),
                  isNotNull(table.entityVersion),
                ),
                gt(table.clientViewVersion, clientView.clientVersion),
              ),
              eq(table.clientGroupId, clientView.clientGroupId),
              eq(table.tenantId, clientView.tenantId),
            ),
          )
          .$dynamic(),
      ),
  );

  const fastForward = Effect.fn("Sync.QueryBuilder.fastForward")(
    <TEntity extends Models.SyncTableName>(entity: TEntity, clientView: ReplicacheClientView) =>
      db.useQueryBuilder((tx) =>
        tx
          .select()
          .from(table)
          .where(
            and(
              eq(table.entity, entity),
              gt(table.clientViewVersion, clientView.clientVersion),
              eq(table.clientGroupId, clientView.clientGroupId),
              eq(table.tenantId, clientView.tenantId),
            ),
          )
          .$dynamic(),
      ),
  );

  return { creates, updates, deletes, fastForward } as const;
});

export const layer = makeService.pipe(Layer.effect(SyncQueryBuilder));
