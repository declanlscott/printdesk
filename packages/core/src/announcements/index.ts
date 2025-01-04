import { and, eq, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { Replicache } from "../replicache";
import { useTenant } from "../tenants/context";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  createAnnouncementMutationArgsSchema,
  deleteAnnouncementMutationArgsSchema,
  updateAnnouncementMutationArgsSchema,
} from "./shared";
import { announcementsTable } from "./sql";

import type { Announcement } from "./sql";

export namespace Announcements {
  export const create = fn(
    createAnnouncementMutationArgsSchema,
    async (values) => {
      await AccessControl.enforce([announcementsTable._.name, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTable._.name }],
      });

      return useTransaction(async (tx) => {
        await tx.insert(announcementsTable).values(values);

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );

  export const read = async (ids: Array<Announcement["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(announcementsTable)
        .where(
          and(
            inArray(announcementsTable.id, ids),
            eq(announcementsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const update = fn(
    updateAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([announcementsTable._.name, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(announcementsTable)
          .set(values)
          .where(
            and(
              eq(announcementsTable.id, id),
              eq(announcementsTable.tenantId, useTenant().id),
            ),
          );

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([announcementsTable._.name, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: announcementsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(announcementsTable)
          .set(values)
          .where(
            and(
              eq(announcementsTable.id, id),
              eq(announcementsTable.tenantId, useTenant().id),
            ),
          );

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );
}
