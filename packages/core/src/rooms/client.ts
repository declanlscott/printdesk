import * as R from "remeda";

import { AccessControl } from "../access-control/client";
import { productsTableName } from "../products/shared";
import { Replicache } from "../replicache/client";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import {
  createRoomMutationArgsSchema,
  defaultWorkflow,
  deleteRoomMutationArgsSchema,
  deliveryOptionsTableName,
  restoreRoomMutationArgsSchema,
  roomsTableName,
  setDeliveryOptionsMutationArgsSchema,
  setWorkflowMutationArgsSchema,
  updateRoomMutationArgsSchema,
  workflowStatusesTableName,
} from "./shared";

import type { DeliveryOptions, Workflow } from "./shared";
import type { Room } from "./sql";

export namespace Rooms {
  export const create = Replicache.mutator(
    createRoomMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, roomsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName }],
      }),
    () => async (tx, values) => {
      await Promise.all([
        Replicache.set(tx, roomsTableName, values.id, values),
        Replicache.set(
          tx,
          workflowStatusesTableName,
          Constants.WORKFLOW_REVIEW_STATUS,
          {
            id: Constants.WORKFLOW_REVIEW_STATUS,
            type: "Review",
            charging: false,
            color: null,
            index: -1,
            roomId: values.id,
            tenantId: values.tenantId,
          },
        ),
        ...defaultWorkflow.map(async (status, index) =>
          Replicache.set(tx, workflowStatusesTableName, status.id, {
            ...status,
            index,
            roomId: values.id,
            tenantId: values.tenantId,
          }),
        ),
      ]);
    },
  );

  export const all = Replicache.query(
    () => ({}),
    () => async (tx) => Replicache.scan(tx, roomsTableName),
  );

  export const byId = Replicache.query(
    (id: Room["id"]) => ({ id }),
    ({ id }) =>
      async (tx) =>
        Replicache.get(tx, roomsTableName, id),
  );

  export const update = Replicache.mutator(
    updateRoomMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, roomsTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    () =>
      async (tx, { id, ...values }) => {
        const prev = await Replicache.get(tx, roomsTableName, id);

        return Replicache.set(tx, roomsTableName, id, {
          ...prev,
          ...values,
        });
      },
  );

  export const delete_ = Replicache.mutator(
    deleteRoomMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, roomsTableName, "delete"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    ({ user }) =>
      async (tx, { id, ...values }) => {
        // Set all products in the room to draft
        const products = await Replicache.scan(tx, productsTableName).then(
          R.filter((product) => product.roomId === id),
        );
        await Promise.all(
          products.map(async (p) => {
            const prev = await Replicache.get(tx, productsTableName, p.id);

            return Replicache.set(tx, productsTableName, p.id, {
              ...prev,
              status: "draft",
            });
          }),
        );

        if (user.role === "administrator") {
          const prev = await Replicache.get(tx, roomsTableName, id);

          return Replicache.set(tx, roomsTableName, id, {
            ...prev,
            ...values,
          });
        }

        await Replicache.del(tx, roomsTableName, id);
      },
  );

  export const restore = Replicache.mutator(
    restoreRoomMutationArgsSchema,
    async (tx, user, { id }) =>
      AccessControl.enforce([tx, user, roomsTableName, "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName, id }],
      }),
    () => async (tx, values) => {
      const prev = await Replicache.get(tx, roomsTableName, values.id);

      return Replicache.set(tx, roomsTableName, values.id, {
        ...prev,
        deletedAt: null,
      });
    },
  );

  export const getWorkflow = Replicache.query(
    (roomId: Room["id"]) => ({ roomId }),
    ({ roomId }) =>
      async (tx) =>
        Replicache.scan(tx, workflowStatusesTableName).then((statuses) =>
          R.pipe(
            statuses,
            R.filter((status) => status.roomId === roomId),
            R.sortBy(R.prop("index")),
            R.reduce((workflow, status) => {
              if (status.type !== "Review")
                workflow.push({
                  id: status.id,
                  type: status.type,
                  color: status.color,
                  charging: status.charging,
                });

              return workflow;
            }, [] as Workflow),
          ),
        ),
  );

  export const setWorkflow = Replicache.mutator(
    setWorkflowMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, roomsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: roomsTableName }],
      }),
    () =>
      async (tx, { workflow, roomId }) => {
        const room = await Replicache.get(tx, roomsTableName, roomId);

        let index = 0;
        for (const status of workflow) {
          await Replicache.set(tx, workflowStatusesTableName, status.id, {
            ...status,
            index,
            roomId,
            tenantId: room.tenantId,
          });

          index++;
        }

        await R.pipe(
          await Replicache.scan(tx, workflowStatusesTableName),
          R.filter((status) => !workflow.some((s) => s.id === status.id)),
          async (dels) =>
            Promise.all(
              dels.map((status) =>
                Replicache.del(tx, workflowStatusesTableName, status.id),
              ),
            ),
        );
      },
  );

  export const getDeliveryOptions = Replicache.query(
    (roomId: Room["id"]) => ({ roomId }),
    ({ roomId }) =>
      async (tx) =>
        Replicache.scan(tx, deliveryOptionsTableName).then((options) =>
          R.pipe(
            options,
            R.filter((option) => option.roomId === roomId),
            R.sortBy(R.prop("index")),
            R.reduce((options, option) => {
              options.push({
                id: option.id,
                description: option.description,
                detailsLabel: option.detailsLabel,
                cost: option.cost,
              });

              return options;
            }, [] as DeliveryOptions),
          ),
        ),
  );

  export const setDeliveryOptions = Replicache.mutator(
    setDeliveryOptionsMutationArgsSchema,
    async (tx, user) =>
      AccessControl.enforce([tx, user, deliveryOptionsTableName, "create"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: deliveryOptionsTableName }],
      }),
    () =>
      async (tx, { options, roomId }) => {
        const room = await Replicache.get(tx, roomsTableName, roomId);

        let index = 0;
        for (const option of options) {
          await Replicache.set(tx, deliveryOptionsTableName, option.id, {
            ...option,
            index,
            roomId,
            tenantId: room.tenantId,
          });

          index++;
        }

        await R.pipe(
          await Replicache.scan(tx, deliveryOptionsTableName),
          R.filter((option) => !options.some((o) => o.id === option.id)),
          async (dels) =>
            Promise.all(
              dels.map((option) =>
                Replicache.del(tx, deliveryOptionsTableName, option.id),
              ),
            ),
        );
      },
  );
}
