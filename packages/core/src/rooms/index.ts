import { and, eq, gte, inArray, notInArray } from "drizzle-orm";
import * as R from "remeda";

import { AccessControl } from "../access-control";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { productsTable } from "../products/sql";
import { Replicache } from "../replicache";
import { useTenant } from "../tenants/context";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
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
    await AccessControl.enforce([roomsTable._.name, "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: roomsTable._.name }],
    });

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

      await afterTransaction(() => Replicache.poke(["/tenant"]));
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
      await AccessControl.enforce([roomsTable._.name, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTable._.name, id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(roomsTable)
          .set(values)
          .where(
            and(eq(roomsTable.id, id), eq(roomsTable.tenantId, useTenant().id)),
          );

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteRoomMutationArgsSchema,
    async ({ id, ...values }) => {
      const tenant = useTenant();

      await AccessControl.enforce([roomsTable._.name, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTable._.name, id }],
      });

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

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );

  export const restore = fn(restoreRoomMutationArgsSchema, async ({ id }) => {
    await AccessControl.enforce([roomsTable._.name, "update"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: roomsTable._.name, id }],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(roomsTable)
        .set({ deletedAt: null })
        .where(
          and(eq(roomsTable.id, id), eq(roomsTable.tenantId, useTenant().id)),
        );

      await afterTransaction(() => Replicache.poke(["/tenant"]));
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

    await AccessControl.enforce([workflowStatusesTable._.name, "create"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: workflowStatusesTable._.name }],
    });

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
          set: buildConflictUpdateColumns(workflowStatusesTable, [
            "id",
            "type",
            "charging",
            "color",
            "index",
            "roomId",
            "tenantId",
          ]),
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

      await afterTransaction(() => Replicache.poke(["/tenant"]));
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

      await AccessControl.enforce([deliveryOptionsTable._.name, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: deliveryOptionsTable._.name }],
      });

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
            set: buildConflictUpdateColumns(deliveryOptionsTable, [
              "id",
              "description",
              "detailsLabel",
              "cost",
              "index",
              "roomId",
              "tenantId",
            ]),
          });

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

        await afterTransaction(() => Replicache.poke(["/tenant"]));
      });
    },
  );
}
