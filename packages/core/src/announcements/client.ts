import { AccessControl } from "../access-control/client";
import { Replicache } from "../replicache/client";
import { ApplicationError } from "../utils/errors";
import {
  announcementsTableName,
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";

export namespace Announcements {
  export const create = Replicache.optimisticMutator(
    createAnnouncementMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, announcementsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName }],
      }),
    () => async (tx, values) =>
      Replicache.set(tx, announcementsTableName, values.id, values),
  );

  export const update = Replicache.optimisticMutator(
    updateAnnouncementMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, announcementsTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get(tx, announcementsTableName, values.id);

      return Replicache.set(tx, announcementsTableName, values.id, {
        ...prev,
        ...values,
      });
    },
  );

  export const delete_ = Replicache.optimisticMutator(
    deleteAnnouncementMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, announcementsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTableName, id }],
      }),
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
  );
}
