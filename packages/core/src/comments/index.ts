import { and, eq, getTableName, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { SharedErrors } from "../errors/shared";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Users } from "../users";
import { fn } from "../utils/shared";
import {
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";
import { commentsTable } from "./sql";

import type { Comment } from "./sql";

export namespace Comments {
  export const create = fn(createCommentMutationArgsSchema, async (values) => {
    await AccessControl.enforce(
      [getTableName(commentsTable), "create", values.orderId],
      {
        Error: SharedErrors.AccessDenied,
        args: [{ name: getTableName(commentsTable) }],
      },
    );

    return useTransaction(async (tx) => {
      const [users] = await Promise.all([
        Users.withOrderAccess(values.orderId),
        tx.insert(commentsTable).values(values),
      ]);

      await afterTransaction(() =>
        poke(users.map((u) => `/users/${u.id}` as const)),
      );
    });
  });

  export const read = async (ids: Array<Comment["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(commentsTable)
        .where(
          and(
            inArray(commentsTable.id, ids),
            eq(commentsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const update = fn(
    updateCommentMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(commentsTable), "update", id], {
        Error: SharedErrors.AccessDenied,
        args: [{ name: getTableName(commentsTable), id }],
      });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(values.orderId),
          tx
            .update(commentsTable)
            .set(values)
            .where(
              and(
                eq(commentsTable.id, id),
                eq(commentsTable.tenantId, useTenant().id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke(users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );

  export const delete_ = fn(
    deleteCommentMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(commentsTable), "delete", id], {
        Error: SharedErrors.AccessDenied,
        args: [{ name: getTableName(commentsTable), id }],
      });

      return useTransaction(async (tx) => {
        const [users] = await Promise.all([
          Users.withOrderAccess(values.orderId),
          tx
            .update(commentsTable)
            .set(values)
            .where(
              and(
                eq(commentsTable.id, id),
                eq(commentsTable.tenantId, useTenant().id),
              ),
            ),
        ]);

        await afterTransaction(() =>
          poke(users.map((u) => `/users/${u.id}` as const)),
        );
      });
    },
  );
}
