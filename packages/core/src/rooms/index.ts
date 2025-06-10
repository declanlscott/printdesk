import {
  and,
  eq,
  getTableName,
  gte,
  inArray,
  notInArray,
  sql,
} from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { buildConflictUpdateColumns } from "../database/columns";
import { afterTransaction, useTransaction } from "../database/context";
import { productsTable } from "../products/sql";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { Constants } from "../utils/constants";
import { fn } from "../utils/shared";
import {
  createRoomMutationArgsSchema,
  defaultWorkflow,
  deleteRoomMutationArgsSchema,
  restoreRoomMutationArgsSchema,
  setDeliveryOptionsMutationArgsSchema,
  setWorkflowMutationArgsSchema,
  updateRoomMutationArgsSchema,
} from "./shared";
import { deliveryOptionsTable, roomsTable, workflowStatusesTable } from "./sql";

import type { DeliveryOption, Room, WorkflowStatus } from "./sql";

export namespace Rooms {
  export const create = fn(createRoomMutationArgsSchema, async (values) => {
    await AccessControl.enforce(getTableName(roomsTable), "create");

    return useTransaction(async (tx) => {
      await Promise.all([
        tx.insert(roomsTable).values(values),
        tx.insert(workflowStatusesTable).values([
          {
            id: Constants.WORKFLOW_REVIEW_STATUS,
            type: "Review",
            charging: false,
            color: null,
            index: -1,
            roomId: values.id,
            tenantId: values.tenantId,
          },
          ...defaultWorkflow.map((status, index) => ({
            ...status,
            index,
            roomId: values.id,
            tenantId: values.tenantId,
          })),
        ]),
      ]);

      await afterTransaction(() => poke("/tenant"));
    });
  });

  export const read = async (ids: Array<Room["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(roomsTable)
        .where(
          and(
            inArray(roomsTable.id, ids),
            eq(roomsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const update = fn(
    updateRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce(getTableName(roomsTable), "update");

      return useTransaction(async (tx) => {
        await tx
          .update(roomsTable)
          .set(values)
          .where(
            and(eq(roomsTable.id, id), eq(roomsTable.tenantId, useTenant().id)),
          );

        await afterTransaction(() => poke("/tenant"));
      });
    },
  );

  export const delete_ = fn(
    deleteRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce(getTableName(roomsTable), "delete");

      return useTransaction(async (tx) => {
        await Promise.all([
          tx
            .update(roomsTable)
            .set({ ...values, status: "draft" })
            .where(
              and(eq(roomsTable.id, id), eq(roomsTable.tenantId, tenant.id)),
            ),
          // Set all products in the room to draft
          tx
            .update(productsTable)
            .set({ status: "draft" })
            .where(
              and(
                eq(productsTable.roomId, id),
                eq(productsTable.tenantId, tenant.id),
              ),
            ),
        ]);

        await afterTransaction(() => poke("/tenant"));
      });
    },
  );

  export const restore = fn(restoreRoomMutationArgsSchema, async ({ id }) => {
    await AccessControl.enforce(getTableName(roomsTable), "update");

    return useTransaction(async (tx) => {
      await tx
        .update(roomsTable)
        .set({ deletedAt: null })
        .where(
          and(eq(roomsTable.id, id), eq(roomsTable.tenantId, useTenant().id)),
        );

      await afterTransaction(() => poke("/tenant"));
    });
  });

  export const readWorkflow = async (ids: Array<WorkflowStatus["id"]>) =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(workflowStatusesTable)
        .where(
          and(
            inArray(workflowStatusesTable.id, ids),
            eq(workflowStatusesTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const setWorkflow = fn(setWorkflowMutationArgsSchema, async (args) => {
    const tenant = useTenant();

    await AccessControl.enforce(getTableName(workflowStatusesTable), "create");

    return useTransaction(async (tx) => {
      const workflow = await tx
        .insert(workflowStatusesTable)
        .values(
          args.workflow.reduce((values, status, index) => {
            values.push({
              ...status,
              index,
              roomId: args.roomId,
              tenantId: tenant.id,
            });

            return values;
          }, [] as Array<WorkflowStatus>),
        )
        .onConflictDoUpdate({
          target: [
            workflowStatusesTable.id,
            workflowStatusesTable.roomId,
            workflowStatusesTable.tenantId,
          ],
          set: {
            ...buildConflictUpdateColumns(workflowStatusesTable, [
              "id",
              "type",
              "charging",
              "color",
              "index",
              "roomId",
              "tenantId",
            ]),
            version: sql`${workflowStatusesTable.version} + 1`,
          },
        })
        .returning();

      await tx
        .delete(workflowStatusesTable)
        .where(
          and(
            notInArray(workflowStatusesTable.id, R.map(workflow, R.prop("id"))),
            gte(workflowStatusesTable.index, 0),
            eq(workflowStatusesTable.roomId, args.roomId),
            eq(workflowStatusesTable.tenantId, tenant.id),
          ),
        );

      await afterTransaction(() => poke("/tenant"));
    });
  });

  export const readDeliveryOptions = async (ids: Array<DeliveryOption["id"]>) =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(deliveryOptionsTable)
        .where(
          and(
            inArray(deliveryOptionsTable.id, ids),
            eq(deliveryOptionsTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const setDeliveryOptions = fn(
    setDeliveryOptionsMutationArgsSchema,
    async (args) => {
      const tenant = useTenant();

      await AccessControl.enforce(getTableName(deliveryOptionsTable), "create");

      return useTransaction(async (tx) => {
        const deliveryOptions = await tx
          .insert(deliveryOptionsTable)
          .values(
            args.options.reduce((values, option, index) => {
              values.push({
                ...option,
                index,
                roomId: args.roomId,
                tenantId: tenant.id,
              });

              return values;
            }, [] as Array<DeliveryOption>),
          )
          .onConflictDoUpdate({
            target: [
              deliveryOptionsTable.id,
              deliveryOptionsTable.roomId,
              deliveryOptionsTable.tenantId,
            ],
            set: {
              ...buildConflictUpdateColumns(deliveryOptionsTable, [
                "id",
                "description",
                "detailsLabel",
                "cost",
                "index",
                "roomId",
                "tenantId",
              ]),
              version: sql`${deliveryOptionsTable.version} + 1`,
            },
          })
          .returning();

        await tx
          .delete(deliveryOptionsTable)
          .where(
            and(
              notInArray(
                deliveryOptionsTable.id,
                R.map(deliveryOptions, R.prop("id")),
              ),
              gte(deliveryOptionsTable.index, 0),
              eq(deliveryOptionsTable.roomId, args.roomId),
              eq(deliveryOptionsTable.tenantId, tenant.id),
            ),
          );

        await afterTransaction(() => poke("/tenant"));
      });
    },
  );
}
