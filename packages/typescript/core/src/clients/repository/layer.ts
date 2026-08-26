import { and, eq, getTableColumns } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ClientsRepository } from ".";
import { Database } from "../../database";
import { tenants } from "../../tenants/sql";
import { clientsTable } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Client, ClientsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = clientsTable;
  const tenantsTable = tenants.table;

  const create = Effect.fn("Clients.Repository.create")((value: InferInsertModel<ClientsTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findById = Effect.fn("Clients.Repository.findById")(
    (id: Client["id"], tenantId: Client["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findWithTenantById = Effect.fn("Clients.Repository.findWithTenantById")(
    (id: Client["id"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select({
              client: getTableColumns(table),
              tenant: getTableColumns(tenantsTable),
            })
            .from(table)
            .innerJoin(tenantsTable, eq(table.tenantId, tenantsTable.id))
            .where(eq(table.id, id)),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Clients.Repository.updateById")(
    (
      id: Client["id"],
      client: Partial<Omit<Client, "id" | "tenantId" | "secretHash">>,
      tenantId: Client["tenantId"],
    ) =>
      db
        .useTransaction((tx) =>
          tx
            .update(table)
            .set(client)
            .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
            .returning(),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const deleteByTenantId = Effect.fn("Clients.Repository.deleteByTenantId")(
    (tenantId: Client["tenantId"]) =>
      db
        .useTransaction((tx) => tx.delete(table).where(eq(table.tenantId, tenantId)))
        .pipe(Effect.asVoid),
  );

  return {
    create,
    findById,
    findWithTenantById,
    updateById,
    deleteByTenantId,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ClientsRepository));
