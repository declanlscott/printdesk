import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  announcementsTableName,
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";

import type { Announcement } from "./sql";

export namespace Announcements {
  export const create = Replicache.createMutator(
    createAnnouncementMutationArgsSchema,
    {
      authorizer: async (tx, user) =>
        AccessControl.enforce([tx, user, announcementsTableName, "create"], {
          Error: ApplicationError.AccessDenied,
          args: [{ name: announcementsTableName }],
        }),
      getMutator: () => async (tx, values) =>
        Replicache.set(tx, announcementsTableName, values.id, values),
    },
  );

  export const all = Replicache.createQuery({
    getQuery: () => async (tx) => Replicache.scan(tx, announcementsTableName),
  });

  export const byId = Replicache.createQuery({
    getDeps: (id: Announcement["id"]) => ({ id }),
    getQuery:
      ({ id }) =>
      async (tx) =>
        Replicache.get(tx, announcementsTableName, id),
  });

  export const update = Replicache.createMutator(
    updateAnnouncementMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, announcementsTableName, "update"], {
          Error: ApplicationError.AccessDenied,
          args: [{ name: announcementsTableName, id }],
        }),
      getMutator: () => async (tx, values) => {
        const prev = await Replicache.get(
          tx,
          announcementsTableName,
          values.id,
        );

        return Replicache.set(tx, announcementsTableName, values.id, {
          ...prev,
          ...values,
        });
      },
    },
  );

  export const delete_ = Replicache.createMutator(
    deleteAnnouncementMutationArgsSchema,
    {
      authorizer: async (tx, user, { id }) =>
        AccessControl.enforce([tx, user, announcementsTableName, "delete"], {
          Error: ApplicationError.AccessDenied,
          args: [{ name: announcementsTableName, id }],
        }),
      getMutator:
        ({ user }) =>
        async (tx, values) => {
          if (user.role === "administrator") {
            const prev = await Replicache.get(
              tx,
              announcementsTableName,
              values.id,
            );

            return Replicache.set(tx, announcementsTableName, values.id, {
              ...prev,
              ...values,
            });
          }

          await Replicache.del(tx, announcementsTableName, values.id);
        },
    },
  );
}
