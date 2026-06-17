import { and, eq, isNull } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ClientsRepository } from ".";
import { Database } from "../../database";
import { clientsTable } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { Client, ClientsTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = clientsTable;

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
    (id: Client["id"], tenantId?: Client["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(and(eq(table.id, id), tenantId ? eq(table.tenantId, tenantId) : undefined)),
        )
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findActiveById = Effect.fn("Clients.Repository.findById")(
    (id: Client["id"], tenantId?: Client["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx
            .select()
            .from(table)
            .where(
              and(
                eq(table.id, id),
                tenantId ? eq(table.tenantId, tenantId) : undefined,
                isNull(table.deletedAt),
              ),
            ),
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

  const deleteById = Effect.fn("Clients.Repository.deleteById")(
    (id: Client["id"], tenantId: Client["tenantId"]) =>
      db
        .useTransaction((tx) =>
          tx.delete(table).where(and(eq(table.id, id), eq(table.tenantId, tenantId))),
        )
        .pipe(Effect.asVoid),
  );

  return {
    create,
    findById,
    findActiveById,
    updateById,
    deleteById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ClientsRepository));
