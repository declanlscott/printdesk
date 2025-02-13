import { and, eq, getTableName, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { Api } from "../backend/api";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import { createInvoiceMutationArgsSchema } from "./shared";
import { invoicesTable } from "./sql";

import type { Invoice } from "./sql";

export namespace Invoices {
  export const create = fn(createInvoiceMutationArgsSchema, async (values) => {
    await AccessControl.enforce([getTableName(invoicesTable), "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: getTableName(invoicesTable) }],
    });

    const res = await Api.send("/invoices", {
      method: "POST",
      body: JSON.stringify({ invoiceId: values.id }),
    });
    if (!res.ok)
      throw new Error(
        `Failed enqueueing invoice ${values.id} for order ${values.orderId}.`,
      );

    return useTransaction(async (tx) => {
      const [users] = await Promise.all([
        Users.withOrderAccess(values.orderId),
        tx.insert(invoicesTable).values(values),
      ]);

      await afterTransaction(() =>
        poke(users.map((u) => `/users/${u.id}` as const)),
      );
    });
  });

  export const read = async (ids: Array<Invoice["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(invoicesTable)
        .where(
          and(
            inArray(invoicesTable.id, ids),
            eq(invoicesTable.tenantId, useTenant().id),
          ),
        ),
    );
}
