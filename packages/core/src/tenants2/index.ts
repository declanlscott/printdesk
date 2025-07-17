import { and, eq, sql } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import { buildConflictUpdateColumns } from "../database2/constructors";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";
import type { PartialExcept } from "../utils/types";

export namespace Tenants {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/tenants/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.tenantsTable.table;

        const upsert = Effect.fn("Tenants.Repository.upsert")(
          (tenant: InferInsertModel<schema.TenantsTable>) =>
            db
              .useTransaction((tx) =>
                tx
                  .insert(table)
                  .values(tenant)
                  .onConflictDoUpdate({
                    target: [table.id],
                    set: {
                      ...buildConflictUpdateColumns(table, [
                        "id",
                        "name",
                        "subdomain",
                        "status",
                      ]),
                      version: sql`${table.version} + 1`,
                      updatedAt: new Date(),
                    },
                  })
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findById = Effect.fn("Tenants.Repository.findById")(
          (id: schema.Tenant["id"]) =>
            db
              .useTransaction((tx) =>
                tx.select().from(table).where(eq(table.id, id)),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIdentityProvider = Effect.fn(
          "Tenants.Repository.findByIdentityProvider",
        )(
          (
            kind: schema.IdentityProvider["kind"],
            id: schema.IdentityProvider["id"],
          ) =>
            db
              .useTransaction((tx) =>
                tx
                  .select({ tenant: table })
                  .from(table)
                  .innerJoin(
                    schema.identityProvidersTable.table,
                    eq(schema.identityProvidersTable.table.tenantId, table.id),
                  )
                  .where(
                    and(
                      eq(schema.identityProvidersTable.table.kind, kind),
                      eq(schema.identityProvidersTable.table.id, id),
                    ),
                  ),
              )
              .pipe(
                Effect.map(Array.map(({ tenant }) => tenant)),
                Effect.flatMap(Array.head),
              ),
        );

        const update = Effect.fn("Tenants.Repository.update")(
          (tenant: PartialExcept<schema.Tenant, "id">) =>
            db
              .useTransaction((tx) =>
                tx
                  .update(table)
                  .set(tenant)
                  .where(eq(table.id, tenant.id))
                  .returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        return { upsert, findById, findByIdentityProvider, update } as const;
      }),
    },
  ) {}
}
