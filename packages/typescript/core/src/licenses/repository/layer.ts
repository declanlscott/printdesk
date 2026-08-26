import { eq } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { LicensesRepository } from ".";
import { Database } from "../../database";
import { licenses } from "../sql";

import type { InferInsertModel } from "drizzle-orm";
import type { License, LicensesTable } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = licenses.table;

  const create = Effect.fn("Licenses.Repository.create")((value: InferInsertModel<LicensesTable>) =>
    db
      .useTransaction((tx) => tx.insert(table).values(value).returning())
      .pipe(
        Effect.map(Array.head),
        Effect.flatMap(Effect.fromOption),
        Effect.catchTag("NoSuchElementError", Effect.die),
      ),
  );

  const findById = Effect.fn("Licenses.Repository.findById")((id: License["id"]) =>
    db
      .useTransaction((tx) => tx.select().from(table).where(eq(table.id, id)))
      .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const findByIdForUpdate = Effect.fn("Licenses.Repository.findByIdForUpdate")(
    (id: License["id"]) =>
      db
        .useTransaction((tx) => tx.select().from(table).where(eq(table.id, id)).for("update"))
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateById = Effect.fn("Licenses.Repository.updateById")(
    (id: License["id"], license: Partial<Omit<License, "id" | "keyHash">>) =>
      db
        .useTransaction((tx) => tx.update(table).set(license).where(eq(table.id, id)).returning())
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return {
    create,
    findById,
    findByIdForUpdate,
    updateById,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(LicensesRepository));
