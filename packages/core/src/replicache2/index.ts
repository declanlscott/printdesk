import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  lte,
  max,
  or,
  sql,
} from "drizzle-orm";
import * as Array from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Struct from "effect/Struct";

import { Database } from "../database2";
import { Constants } from "../utils/constants";
import {
  ReplicacheClientGroupsSchema,
  ReplicacheClientsSchema,
  ReplicacheClientViewMetadataSchema,
  ReplicacheClientViewsSchema,
} from "./schemas";

import type { InferInsertModel } from "drizzle-orm";
import type { Models } from "../models2";

export namespace Replicache {
  export class ClientGroupsRepository extends Effect.Service<ClientGroupsRepository>()(
    "@printdesk/core/replicache/ClientGroupsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ReplicacheClientGroupsSchema.table.definition;

        const upsert = Effect.fn("Replicache.ClientGroupsRepository.upsert")(
          (clientGroup: InferInsertModel<typeof table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(clientGroup)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: {
                      clientVersion: sql.raw(
                        `EXCLUDED."${table.clientVersion.name}"`,
                      ),
                      clientViewVersion: sql.raw(
                        `COALESCE(EXCLUDED."${table.clientViewVersion.name}", NULL)`,
                      ),
                      updatedAt: sql.raw(
                        `COALESCE(EXCLUDED."${table.updatedAt.name}", NOW())`,
                      ),
                    },
                  })
                  .returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findByIdForUpdate = Effect.fn(
          "Replicache.ClientGroupsRepository.findByIdForUpdate",
        )(
          (
            id: ReplicacheClientGroupsSchema.Row["id"],
            tenantId: ReplicacheClientGroupsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .for("update"),
              )
              .pipe(Effect.flatMap(Array.head)),
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
      }),
    },
  ) {}

  export class ClientsRepository extends Effect.Service<ClientsRepository>()(
    "@printdesk/core/replicache/ClientsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ReplicacheClientsSchema.table.definition;

        const upsert = Effect.fn("Replicache.ClientsRepository.upsert")(
          (client: InferInsertModel<typeof table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(client)
                  .onConflictDoUpdate({
                    target: [table.id, table.tenantId],
                    set: {
                      lastMutationId: client.lastMutationId,
                      version: client.version,
                      updatedAt: sql.raw(
                        `COALESCE(EXCLUDED."${table.updatedAt.name}", NOW())`,
                      ),
                    },
                  })
                  .returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findByIdForUpdate = Effect.fn(
          "Replicache.ClientsRepository.findByIdForUpdate",
        )(
          (
            id: ReplicacheClientsSchema.Row["id"],
            tenantId: ReplicacheClientsSchema.Row["tenantId"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select()
                  .from(table)
                  .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
                  .for("update"),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findSinceVersionByGroupId = Effect.fn(
          "Replicache.ClientsRepository.findSinceVersionByGroupId",
        )(
          (
            version: ReplicacheClientsSchema.Row["version"],
            clientGroupId: ReplicacheClientsSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientsSchema.Row["tenantId"],
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

        const deleteByGroupIds = Effect.fn(
          "Replicache.ClientsRepository.deleteByGroupIds",
        )(
          (
            clientGroupIds: ReadonlyArray<
              ReplicacheClientsSchema.Row["clientGroupId"]
            >,
          ) =>
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
      }),
    },
  ) {}

  export class ClientViewsRepository extends Effect.Service<ClientViewsRepository>()(
    "@printdesk/core/replicache/ClientViewsRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ReplicacheClientViewsSchema.table.definition;

        const upsert = Effect.fn("Replicache.ClientViewsRepository.upsert")(
          (clientView: InferInsertModel<typeof table>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(clientView)
                  .onConflictDoUpdate({
                    target: [
                      table.clientGroupId,
                      table.version,
                      table.tenantId,
                    ],
                    set: {
                      clientVersion: sql.raw(
                        `EXCLUDED."${table.clientVersion.name}"`,
                      ),
                    },
                  })
                  .returning(),
              )
              .pipe(
                Effect.flatMap(Array.head),
                Effect.catchTag("NoSuchElementException", Effect.die),
              ),
        );

        const findById = Effect.fn("Replicache.ClientViewsRepository.findById")(
          (
            clientGroupId: ReplicacheClientViewsSchema.Row["clientGroupId"],
            version: ReplicacheClientViewsSchema.Row["version"],
            tenantId: ReplicacheClientViewsSchema.Row["tenantId"],
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
            clientGroupId: ReplicacheClientViewsSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientViewsSchema.Row["tenantId"],
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
                Effect.map(Struct.get("version")),
              ),
        );

        const deleteByGroupIds = Effect.fn(
          "Replicache.ClientViewsRepository.deleteByGroupIds",
        )(
          (
            clientGroupIds: ReadonlyArray<
              ReplicacheClientViewsSchema.Row["clientGroupId"]
            >,
          ) =>
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
      }),
    },
  ) {}

  export class ClientViewMetadataRepository extends Effect.Service<ClientViewMetadataRepository>()(
    "@printdesk/core/replicache/ClientViewMetadataRepository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ReplicacheClientViewMetadataSchema.table.definition;

        const upsertMany = Effect.fn(
          "Replicache.ClientViewMetadata.upsertMany",
        )((values: Array<InferInsertModel<typeof table>>) =>
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

        const deleteByGroupIds = Effect.fn(
          "Replicache.ClientViewMetadata.deleteByGroupIds",
        )(
          (
            clientGroupIds: ReadonlyArray<
              ReplicacheClientViewMetadataSchema.Row["clientGroupId"]
            >,
          ) =>
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
      }),
    },
  ) {}

  export class ClientViewMetadataQueryBuilder extends Effect.Service<ClientViewMetadataQueryBuilder>()(
    "@printdesk/core/replicache/ClientViewMetadataQueryBuilder",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = ReplicacheClientViewMetadataSchema.table.definition;

        const creates = Effect.fn(
          "Replicache.ClientViewMetadataQueryBuilder.creates",
        )(
          <TEntity extends Models.SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientViewMetadataSchema.Row["tenantId"],
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
          <TEntity extends Models.SyncTableName>(
            entity: TEntity,
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientViewMetadataSchema.Row["tenantId"],
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
          <TEntity extends Models.SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientViewMetadataSchema.Row["tenantId"],
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
          <TEntity extends Models.SyncTableName>(
            entity: TEntity,
            clientViewVersion: ReplicacheClientViewMetadataSchema.Row["clientViewVersion"],
            clientGroupId: ReplicacheClientViewMetadataSchema.Row["clientGroupId"],
            tenantId: ReplicacheClientViewMetadataSchema.Row["tenantId"],
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
