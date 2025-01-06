import { and, eq, inArray } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { Replicache } from "../replicache";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { ApplicationError } from "../utils/errors";
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
      [ordersTable._.name, "create", values.billingAccountId],
      {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTable._.name }],
      },
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
        Replicache.poke(users.map((u) => `/users/${u.id}` as const)),
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
      await AccessControl.enforce([ordersTable._.name, "update", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTable._.name, id }],
      });

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
          Replicache.poke(users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteOrderMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([ordersTable._.name, "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: ordersTable._.name, id }],
      });

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
          Replicache.poke(users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );
}
