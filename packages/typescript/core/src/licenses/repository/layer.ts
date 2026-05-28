import { eq } from "drizzle-orm";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { LicensesRepository } from ".";
import { Database } from "../../database";
import { tenants } from "../../tenants/sql";
import { licenses } from "../sql";

import type { License } from "../sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const db = yield* Database;
  const table = licenses.table;

  const findByKeyWithTenant = Effect.fn("Licenses.Repository.findByKey")((key: License["key"]) =>
    db
      .useTransaction((tx) =>
        tx
          .select({
            license: table,
            tenant: tenants.table,
          })
          .from(table)
          .leftJoin(tenants.table, eq(tenants.table.id, table.tenantId))
          .where(eq(table.key, key)),
      )
      .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  const updateByKey = Effect.fn("Licenses.Repository.updateByKey")(
    (key: License["key"], license: Partial<Omit<License, "key">>) =>
      db
        .useTransaction((tx) => tx.update(table).set(license).where(eq(table.key, key)).returning())
        .pipe(Effect.map(Array.head), Effect.flatMap(Effect.fromOption)),
  );

  return { findByKeyWithTenant, updateByKey } as const;
});

export const layer = makeService.pipe(Layer.effect(LicensesRepository));
