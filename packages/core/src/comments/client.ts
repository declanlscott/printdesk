import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import {
  commentsTableName,
  createCommentMutationArgsSchema,
  deleteCommentMutationArgsSchema,
  updateCommentMutationArgsSchema,
} from "./shared";

import type { Comment } from "./sql";

export namespace Comments {
  export const create = Replicache.createMutator(
    createCommentMutationArgsSchema,
    {
      authorizer: async (tx, user, { orderId }) =>
        AccessControl.enforce(tx, user, commentsTableName, "create", orderId),
      getMutator: () => async (tx, values) =>
        Replicache.set(tx, commentsTableName, values.id, values),
    },
  );

  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, commentsTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: Comment["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, commentsTableName, id),
  });

  export const update = Replicache.createMutator(
    updateCommentMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce(tx, user, commentsTableName, "update", id),
      getMutator: () => async (tx, values) => {
        const prev = await Replicache.get(tx, commentsTableName, values.id);

        return Replicache.set(tx, commentsTableName, values.id, {
          ...prev,
          ...values,
        });
      },
    },
  );

  export const delete_ = Replicache.createMutator(
    deleteCommentMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce(tx, user, commentsTableName, "delete", id),
      getMutator:
        ({ user }) =>
        async (tx, values) => {
          if (user.role === "administrator") {
            const prev = await Replicache.get(tx, commentsTableName, values.id);

            return Replicache.set(tx, commentsTableName, values.id, {
              ...prev,
              ...values,
            });
          }

          await Replicache.del(tx, commentsTableName, values.id);
        },
    },
  );
}
