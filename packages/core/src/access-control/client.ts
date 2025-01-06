import * as R from "remeda";

import { announcementsTableName } from "../announcements/shared";
import {
  billingAccountCustomerAuthorizationsTableName,
  billingAccountManagerAuthorizationsTableName,
  billingAccountsTableName,
} from "../billing-accounts/shared";
import { commentsTableName } from "../comments/shared";
import { invoicesTableName } from "../invoices/shared";
import { ordersTableName } from "../orders/shared";
import { productsTableName } from "../products/shared";
import { Replicache } from "../replicache/client";
import {
  deliveryOptionsTableName,
  roomsTableName,
  workflowStatusesTableName,
} from "../rooms/shared";
import { tenantsTableName } from "../tenants/shared";
import { usersTableName } from "../users/shared";

import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Comment } from "../comments/sql";
import type { Order } from "../orders/sql";
import type { UserRole } from "../users/shared";
import type { User, UserData } from "../users/sql";
import type { AnyError, CustomError, InferCustomError } from "../utils/types";
import type { Action, Resource } from "./shared";

export namespace AccessControl {
  export type Permissions = Record<
    UserRole,
    Record<
      Resource,
      Record<
        Action,
        | boolean
        | ((
            tx: ReadTransaction | WriteTransaction,
            user: DeepReadonlyObject<UserData>,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...input: Array<any>
          ) => boolean | Promise<boolean>)
      >
    >
  >;

  export const permissions = {
    administrator: {
      [announcementsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [billingAccountsTableName]: {
        create: false,
        update: true,
        delete: true,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: true,
        update: false,
        delete: true,
      },
      [commentsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      ["documents-mime-types"]: {
        create: false,
        update: true,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: true,
        delete: false,
      },
      [deliveryOptionsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [invoicesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: true,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      services: {
        create: false,
        update: true,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: true,
        delete: true,
      },
      [workflowStatusesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [announcementsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [billingAccountsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: true,
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: false,
        update: true,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [announcementsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountsTableName]: {
        create: false,
        update: async (tx, user, billingAccountId: BillingAccount["id"]) => {
          try {
            const billingAccount = await Replicache.get(
              tx,
              billingAccountsTableName,
              billingAccountId,
            );

            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            if (order.customerId === user.id) return true;

            const billingAccount = await Replicache.get(
              tx,
              billingAccountsTableName,
              order.billingAccountId,
            );

            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: async (tx, user, billingAccountId: BillingAccount["id"]) => {
          try {
            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountCustomerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccountId &&
                  authorization.customerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            const workflowStatus = await Replicache.get(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );

            if (workflowStatus.type !== "Review") return false;
            if (order.customerId === user.id) return true;

            const billingAccount = await Replicache.get(
              tx,
              billingAccountsTableName,
              order.billingAccountId,
            );

            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        delete: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            const workflowStatus = await Replicache.get(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );

            if (workflowStatus.type !== "Review") return false;
            if (order.customerId === user.id) return true;

            const billingAccount = await Replicache.get(
              tx,
              billingAccountsTableName,
              order.billingAccountId,
            );

            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountManagerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccount.id &&
                  authorization.managerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
    },
    customer: {
      [announcementsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
        update: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, commentId: Comment["id"]) => {
          try {
            const comment = await Replicache.get(
              tx,
              commentsTableName,
              commentId,
            );

            return comment.authorId === user.id;
          } catch {
            return false;
          }
        },
      },
      ["documents-mime-types"]: {
        create: false,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        update: false,
        delete: false,
      },
      [deliveryOptionsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: async (tx, user, billingAccountId: BillingAccount["id"]) => {
          try {
            const billingAccount = await Replicache.get(
              tx,
              billingAccountsTableName,
              billingAccountId,
            );

            return R.pipe(
              await Replicache.scan(
                tx,
                billingAccountCustomerAuthorizationsTableName,
              ),
              R.filter(
                (authorization) =>
                  authorization.billingAccountId === billingAccount.id &&
                  authorization.customerId === user.id,
              ),
              R.length(),
              R.isDeepEqual(1),
            );
          } catch {
            return false;
          }
        },
        update: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            const workflowStatus = await Replicache.get(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );
            if (workflowStatus.type !== "Review") return false;

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
        delete: async (tx, user, orderId: Order["id"]) => {
          try {
            const order = await Replicache.get(tx, ordersTableName, orderId);

            const workflowStatus = await Replicache.get(
              tx,
              workflowStatusesTableName,
              order.workflowStatus,
            );
            if (workflowStatus.type !== "Review") return false;

            return order.customerId === user.id;
          } catch {
            return false;
          }
        },
      },
      "papercut-sync": {
        create: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: false,
        update: false,
        delete: false,
      },
    },
  } as const satisfies Permissions;

  export async function check<
    TResource extends Resource,
    TAction extends Action,
    TPermission extends (typeof permissions)[UserRole][TResource][TAction],
  >(
    tx: ReadTransaction | WriteTransaction,
    user: DeepReadonlyObject<UserData>,
    resource: TResource,
    action: TAction,
    ...input: TPermission extends (
      tx: ReadTransaction | WriteTransaction,
      user: DeepReadonlyObject<UserData>,
      ...input: infer TInput
    ) => unknown
      ? TInput
      : Array<never>
  ) {
    const permission = (permissions as Permissions)[user.profile.role][
      resource
    ][action];

    return new Promise<boolean>((resolve) => {
      if (typeof permission === "boolean") return resolve(permission);

      return resolve(permission(tx, user, ...input));
    });
  }

  export async function enforce<
    TResource extends Resource,
    TAction extends Action,
    TPermission extends (typeof permissions)[UserRole][TResource][TAction],
    TMaybeError extends AnyError | undefined,
  >(
    args: Parameters<typeof check<TResource, TAction, TPermission>>,
    customError?: TMaybeError extends AnyError
      ? InferCustomError<CustomError<TMaybeError>>
      : never,
  ) {
    const access = await check(...args);

    if (!access) {
      const message = `Access denied for action "${args[3]}" on resource "${args[2]} with input "${args[4]}".`;

      console.log(message);

      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
