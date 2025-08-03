import { and, eq, gt, isNotNull, lte, max, or, sql } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import {
  replicacheClientGroupsTable,
  replicacheClientsTable,
  replicacheClientViewMetadataTable,
  replicacheClientViewsTable,
} from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { SyncTableName } from "../database2/tables";
import type {
  ReplicacheClient,
  ReplicacheClientGroup,
  ReplicacheClientView,
  ReplicacheClientViewMetadata,
  ReplicacheClientViewMetadataTable,
  ReplicacheClientViewsTable,
} from "./sql";

export namespace Replicache {
  export class ClientGroupsRepository extends Effect.Service<ClientGroupsRepository>()(
    "@printdesk/core/replicache/ClientGroupsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = replicacheClientGroupsTable;

        const findById = Effect.fn(
          "Replicache.ClientGroupsRepository.findById",
        )(
          (
            id: ReplicacheClientGroup["id"],
            tenantId: ReplicacheClientGroup["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return { findById } as const;
      }),
    },
  ) {}

  export class ClientsRepository extends Effect.Service<ClientsRepository>()(
    "@printdesk/core/replicache/ClientsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = replicacheClientsTable;

        const findById = Effect.fn("Replicache.ClientsRepository.findById")(
          (
            id: ReplicacheClient["id"],
            tenantId: ReplicacheClient["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
              )
              .pipe(Effect.flatMap(Array.head)),
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

        return { findById, findSinceVersionByGroupId } as const;
      }),
    },
  ) {}

  export class ClientViewsRepository extends Effect.Service<ClientViewsRepository>()(
    "@printdesk/core/replicache/ClientViewsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = replicacheClientViewsTable;

        const upsert = Effect.fn("Replicache.ClientViewsRepository.upsert")(
          (clientView: InferInsertModel<ReplicacheClientViewsTable>) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(clientView)
                .onConflictDoUpdate({
                  target: [table.clientGroupId, table.version, table.tenantId],
                  set: { clientVersion: sql`EXCLUDED.${table.clientVersion}` },
                }),
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
              .pipe(Effect.flatMap(Array.head)),
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
                  .where(
                    and(
                      eq(table.clientGroupId, clientGroupId),
                      eq(table.tenantId, tenantId),
                    ),
                  ),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.map(({ version }) => version ?? 0),
              ),
        );

        return { upsert, findById, findMaxVersionByGroupId } as const;
      }),
    },
  ) {}

  export class ClientViewMetadataRepository extends Effect.Service<ClientViewMetadataRepository>()(
    "@printdesk/core/replicache/ClientViewMetadataRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = replicacheClientViewMetadataTable;

        const upsertMany = Effect.fn(
          "Replicache.ClientViewMetadata.upsertMany",
        )(
          (
            values: Array<InferInsertModel<ReplicacheClientViewMetadataTable>>,
          ) =>
            db.useTransaction((tx) =>
              tx
                .insert(table)
                .values(values)
                .onConflictDoUpdate({
                  target: [
                    table.clientGroupId,
                    table.entity,
                    table.entityId,
                    table.tenantId,
                  ],
                  set: {
                    entityVersion: sql`EXCLUDED.${table.entityVersion}`,
                    clientViewVersion: sql`EXCLUDED.${table.clientViewVersion}`,
                  },
                })
                .returning(),
            ),
        );

        return { upsertMany } as const;
      }),
    },
  ) {}

  export class ClientViewMetadataQueryBuilder extends Effect.Service<ClientViewMetadataQueryBuilder>()(
    "@printdesk/core/replicache/ClientViewMetadataQueryBuilder",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = replicacheClientViewMetadataTable;

        const creates = Effect.fn(
          "Replicache.ClientViewMetadataQueryBuilder.creates",
        )(
          <TEntity extends SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: ReplicacheClientViewMetadata["tenantId"],
          ) =>
            db.useDynamic((tx) =>
              tx
                .select({ id: table.entityId })
                .from(table)
                .where(
                  and(
                    eq(table.entity, entity),
                    eq(table.clientGroupId, clientGroupId),
                    lte(table.clientViewVersion, clientViewVersion),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .$dynamic(),
            ),
        );

        const updates = Effect.fn(
          "Replicache.ClientViewMetadataQueryBuilder.updates",
        )(
          <TEntity extends SyncTableName>(
            entity: TEntity,
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: ReplicacheClientViewMetadata["tenantId"],
          ) =>
            db.useDynamic((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(
                    eq(table.entity, entity),
                    eq(table.clientGroupId, clientGroupId),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .$dynamic(),
            ),
        );

        const deletes = Effect.fn(
          "Replicache.ClientViewMetadataQueryBuilder.deletes",
        )(
          <TEntity extends SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: ReplicacheClientViewMetadata["tenantId"],
          ) =>
            db.useDynamic((tx) =>
              tx
                .select({ id: table.entityId })
                .from(table)
                .where(
                  and(
                    eq(table.entity, entity),
                    or(
                      and(
                        lte(table.clientViewVersion, clientViewVersion),
                        isNotNull(table.entityVersion),
                      ),
                      gt(table.clientViewVersion, clientViewVersion),
                    ),
                    eq(table.clientGroupId, clientGroupId),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .$dynamic(),
            ),
        );

        const fastForward = Effect.fn(
          "Replicache.ClientViewMetadataQueryBuilder.fastForward",
        )(
          <TEntity extends SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadata["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadata["clientGroupId"],
            tenantId: ReplicacheClientViewMetadata["tenantId"],
          ) =>
            db.useDynamic((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(
                    eq(table.entity, entity),
                    gt(table.clientViewVersion, clientViewVersion),
                    eq(table.clientGroupId, clientGroupId),
                    eq(table.tenantId, tenantId),
                  ),
                )
                .$dynamic(),
            ),
        );

        return { creates, updates, deletes, fastForward } as const;
      }),
    },
  ) {}
}
