import { and, eq, inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { Database } from "../database2";
import * as schema from "../database2/schema";

import type { InferInsertModel } from "drizzle-orm";

export namespace Invoices {
  export class Repository extends Effect.Service<Repository>()(
    "@printdesk/core/invoices/Repository",
    {
      dependencies: [Database.TransactionManager.Default],
      effect: Effect.gen(function* () {
        const db = yield* Database.TransactionManager;
        const table = schema.invoicesTable.table;

        const create = Effect.fn("Invoices.Repository.create")(
          (invoice: InferInsertModel<schema.InvoicesTable>) =>
            db
              .useTransaction((tx) =>
                tx.insert(table).values(invoice).returning(),
              )
              .pipe(Effect.flatMap(Array.head)),
        );

        const findByIds = Effect.fn("Invoices.Repository.findByIds")(
          (
            ids: ReadonlyArray<schema.Invoice["id"]>,
            tenantId: schema.Invoice["tenantId"],
          ) =>
            db.useTransaction((tx) =>
              tx
                .select()
                .from(table)
                .where(
                  and(inArray(table.id, ids), eq(table.tenantId, tenantId)),
                ),
            ),
        );

        return { create, findByIds } as const;
      }),
    },
  ) {}
}
