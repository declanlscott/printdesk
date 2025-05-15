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
import { isSingleton } from "../utils/shared";

import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Comment } from "../comments/sql";
import type { Order } from "../orders/sql";
import type { UserRole } from "../users/shared";
import type { User } from "../users/sql";
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
            user: DeepReadonlyObject<User>,
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
        read: true,
        update: true,
        delete: true,
      },
      [billingAccountsTableName]: {
        create: false,
        read: true,
        update: true,
        delete: true,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: true,
        read: true,
        update: false,
        delete: true,
      },
      [commentsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [deliveryOptionsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [invoicesTableName]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      "identity-providers": {
        create: true,
        read: true,
        update: false,
        delete: true,
      },
      [ordersTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      services: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        read: true,
        update: true,
        delete: true,
      },
      [workflowStatusesTableName]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
    },
    operator: {
      [announcementsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [billingAccountsTableName]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [commentsTableName]: {
        create: true,
        read: true,
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
      [deliveryOptionsTableName]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      "identity-providers": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [ordersTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      "papercut-sync": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: true,
        read: true,
        update: true,
        delete: true,
      },
      [roomsTableName]: {
        create: false,
        read: true,
        update: true,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        read: true,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: true,
        read: true,
        update: false,
        delete: false,
      },
    },
    manager: {
      [announcementsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountsTableName]: {
        create: false,
        read: true,
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
              isSingleton,
            );
          } catch {
            return false;
          }
        },
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        read: true,
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
              isSingleton,
            );
          } catch {
            return false;
          }
        },
        read: true,
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
      [deliveryOptionsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      "identity-providers": {
        create: false,
        read: false,
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
              isSingleton,
            );
          } catch {
            return false;
          }
        },
        read: true,
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
              isSingleton,
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
              isSingleton,
            );
          } catch {
            return false;
          }
        },
      },
      "papercut-sync": {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        read: true,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
    },
    customer: {
      [announcementsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountCustomerAuthorizationsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [billingAccountManagerAuthorizationsTableName]: {
        create: false,
        read: true,
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
        read: true,
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
      [deliveryOptionsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-mime-types"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["documents-size-limit"]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [invoicesTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      ["monthly-active-users"]: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      "identity-providers": {
        create: false,
        read: false,
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
              isSingleton,
            );
          } catch {
            return false;
          }
        },
        read: true,
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
        read: false,
        update: false,
        delete: false,
      },
      [productsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [roomsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      services: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
      [tenantsTableName]: {
        create: false,
        read: true,
        update: false,
        delete: false,
      },
      [usersTableName]: {
        create: false,
        read: true,
        update: false,
        delete: (_tx, user, userId: User["id"]) => user.id === userId,
      },
      [workflowStatusesTableName]: {
        create: false,
        read: true,
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
    user: DeepReadonlyObject<User>,
    resource: TResource,
    action: TAction,
    ...input: TPermission extends (
      tx: ReadTransaction | WriteTransaction,
      user: DeepReadonlyObject<User>,
      ...input: infer TInput
    ) => unknown
      ? TInput
      : Array<never>
  ) {
    const permission = (permissions as Permissions)[user.role][resource][
      action
    ];

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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (customError) throw new customError.Error(...customError.args);

      throw new Error(message);
    }
  }
}
