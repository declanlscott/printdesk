import { and, eq, getTableName, inArray } from "drizzle-orm";

import { AccessControl } from "../access-control";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { SharedErrors } from "../errors/shared";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
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
      await AccessControl.enforce(
        [getTableName(announcementsTable), "create"],
        {
          Error: SharedErrors.AccessDenied,
          args: [{ name: getTableName(announcementsTable) }],
        },
      );

      return useTransaction(async (tx) => {
        await tx.insert(announcementsTable).values(values);

        await afterTransaction(() => poke(["/tenant"]));
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
      await AccessControl.enforce(
        [getTableName(announcementsTable), "update"],
        {
          Error: SharedErrors.AccessDenied,
          args: [{ name: getTableName(announcementsTable), id }],
        },
      );

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

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteAnnouncementMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(
        [getTableName(announcementsTable), "delete"],
        {
          Error: SharedErrors.AccessDenied,
          args: [{ name: getTableName(announcementsTable), id }],
        },
      );

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

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );
}
