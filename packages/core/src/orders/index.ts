import { and, eq, getTableName, inArray } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { fn } from "../utils/shared";
import {
  createOrderMutationArgsSchema,
  deleteOrderMutationArgsSchema,
  updateOrderMutationArgsSchema,
} from "./shared";
import { ordersTable } from "./sql";

import type { Order } from "./sql";

export namespace Orders {
  export const create = fn(createOrderMutationArgsSchema, async (values) => {
    await AccessControl.enforce(
      getTableName(ordersTable),
      "create",
      values.billingAccountId,
    );

    return useTransaction(async (tx) => {
      const order = await tx
        .insert(ordersTable)
        .values(values)
        .returning({ id: ordersTable.id })
        .then(R.first());
      if (!order) throw new Error("Failed to insert order");

      const users = await Users.withOrderAccess(order.id);

      await afterTransaction(() =>
        poke(...users.map((u) => `/users/${u.id}` as const)),
      );
    });
  });

  export const read = async (ids: Array<Order["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(ordersTable)
        .where(
          and(
            inArray(ordersTable.id, ids),
            eq(ordersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const update = fn(
    updateOrderMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(getTableName(ordersTable), "update", id);

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(id),
          tx
            .update(ordersTable)
            .set(values)
            .where(
              and(
                eq(ordersTable.id, id),
                eq(ordersTable.tenantId, useTenant().id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke(...users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteOrderMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(getTableName(ordersTable), "delete", id);

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(id),
          tx
            .update(ordersTable)
            .set(values)
            .where(
              and(
                eq(ordersTable.id, id),
                eq(ordersTable.tenantId, useTenant().id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke(...users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );
}
