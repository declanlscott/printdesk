import {
  ConditionalCheckFailedException,
  DynamoDBServiceException,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { format } from "date-fns";
import { and, eq, getTableName, inArray, sql } from "drizzle-orm";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { AccessControl } from "../access-control";
import { assertActor } from "../actors/context";
import {
  billingAccountCustomerAuthorizationsTable,
  billingAccountManagerAuthorizationsTable,
  billingAccountsTable,
} from "../billing-accounts/sql";
import { buildConflictUpdateColumns } from "../drizzle/columns";
import { afterTransaction, useTransaction } from "../drizzle/context";
import { ordersTable } from "../orders/sql";
import { poke } from "../replicache/poke";
import { useTenant } from "../tenants/context";
import { DynamoDb } from "../utils/aws";
import { Constants } from "../utils/constants";
import { ApplicationError } from "../utils/errors";
import { fn } from "../utils/shared";
import {
  deleteUserMutationArgsSchema,
  restoreUserMutationArgsSchema,
  updateUserRoleMutationArgsSchema,
} from "./shared";
import { usersTable } from "./sql";

import type { InferInsertModel } from "drizzle-orm";
import type { BillingAccount } from "../billing-accounts/sql";
import type { Order } from "../orders/sql";
import type { PartialExcept } from "../utils/types";
import type { UserRole } from "./shared";
import type { User, UserByOrigin, UsersTable } from "./sql";

export namespace Users {
  export const put = async (values: Array<InferInsertModel<UsersTable>>) =>
    useTransaction((tx) =>
      tx
        .insert(usersTable)
        .values(values)
        .onConflictDoUpdate({
          target: [usersTable.id, usersTable.tenantId],
          set: {
            ...buildConflictUpdateColumns(usersTable, [
              "origin",
              "username",
              "oauth2UserId",
              "oauth2ProviderId",
              "name",
              "email",
              "role",
              "createdAt",
              "updatedAt",
              "deletedAt",
            ]),
            version: sql`version + 1`,
          },
        })
        .returning(),
    );

  export const read = async (ids: Array<User["id"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            inArray(usersTable.id, ids),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const byRoles = async (
    roles: Array<UserRole> = [
      "administrator",
      "operator",
      "manager",
      "customer",
    ],
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            inArray(usersTable.role, roles),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const byOrigin = async <TUserOrigin extends User["origin"]>(
    origin: TUserOrigin,
  ) =>
    useTransaction(
      (tx) =>
        tx
          .select()
          .from(usersTable)
          .where(
            and(
              eq(usersTable.origin, origin),
              eq(usersTable.tenantId, useTenant().id),
            ),
          ) as unknown as Promise<Array<UserByOrigin<TUserOrigin>>>,
    );

  export const byOauth2 = async (
    userId: User["oauth2UserId"],
    providerId: User["oauth2ProviderId"],
  ) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.oauth2UserId, userId),
            eq(usersTable.oauth2ProviderId, providerId),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export const byUsernames = async (usernames: Array<User["username"]>) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            inArray(usersTable.username, usernames),
            eq(usersTable.tenantId, useTenant().id),
          ),
        ),
    );

  export async function withOrderAccess(orderId: Order["id"]) {
    const tenant = useTenant();

    return useTransaction(async (tx) => {
      const [adminsOps, managers, [customer]] = await Promise.all([
        byRoles(["administrator", "operator"]),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            billingAccountManagerAuthorizationsTable,
            and(
              eq(
                usersTable.id,
                billingAccountManagerAuthorizationsTable.managerId,
              ),
              eq(
                usersTable.tenantId,
                billingAccountManagerAuthorizationsTable.tenantId,
              ),
            ),
          )
          .innerJoin(
            ordersTable,
            and(
              eq(
                billingAccountManagerAuthorizationsTable.billingAccountId,
                ordersTable.billingAccountId,
              ),
              eq(billingAccountsTable.tenantId, tenant.id),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
        tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .innerJoin(
            ordersTable,
            and(
              eq(usersTable.id, ordersTable.customerId),
              eq(usersTable.tenantId, ordersTable.tenantId),
            ),
          )
          .where(
            and(
              eq(ordersTable.id, orderId),
              eq(ordersTable.tenantId, tenant.id),
            ),
          ),
      ]);

      return R.uniqueBy([...adminsOps, ...managers, customer], R.prop("id"));
    });
  }

  export const withCustomerAuthorization = async (
    accountId: BillingAccount["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({
          customerId: billingAccountCustomerAuthorizationsTable.customerId,
        })
        .from(billingAccountCustomerAuthorizationsTable)
        .where(
          and(
            eq(
              billingAccountCustomerAuthorizationsTable.billingAccountId,
              accountId,
            ),
            eq(
              billingAccountCustomerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const withManagerAuthorization = async (
    accountId: BillingAccount["id"],
  ) =>
    useTransaction(async (tx) =>
      tx
        .select({
          managerId: billingAccountManagerAuthorizationsTable.managerId,
        })
        .from(billingAccountManagerAuthorizationsTable)
        .where(
          and(
            eq(
              billingAccountManagerAuthorizationsTable.billingAccountId,
              accountId,
            ),
            eq(
              billingAccountManagerAuthorizationsTable.tenantId,
              useTenant().id,
            ),
          ),
        ),
    );

  export const updateOne = async (values: PartialExcept<User, "id">) =>
    useTransaction(async (tx) => {
      await tx
        .update(usersTable)
        .set(values)
        .where(
          and(
            eq(usersTable.id, values.id),
            eq(usersTable.tenantId, useTenant().id),
          ),
        );

      await afterTransaction(() => poke(["/tenant"]));
    });

  export const updateRole = fn(
    updateUserRoleMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(usersTable), "update"], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(usersTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set(values)
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, useTenant().id)),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const delete_ = fn(
    deleteUserMutationArgsSchema,
    async ({ id, ...values }) => {
      await AccessControl.enforce([getTableName(usersTable), "delete", id], {
        Error: ApplicationError.AccessDenied,
        args: [{ name: getTableName(usersTable), id }],
      });

      return useTransaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ ...values, role: "customer" })
          .where(
            and(eq(usersTable.id, id), eq(usersTable.tenantId, useTenant().id)),
          );

        await afterTransaction(() => poke(["/tenant"]));
      });
    },
  );

  export const restore = fn(restoreUserMutationArgsSchema, async ({ id }) => {
    await AccessControl.enforce([getTableName(usersTable), "update"], {
      Error: ApplicationError.AccessDenied,
      args: [{ name: getTableName(usersTable), id }],
    });

    return useTransaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({ deletedAt: null })
        .where(
          and(eq(usersTable.id, id), eq(usersTable.tenantId, useTenant().id)),
        );

      await afterTransaction(() => poke(["/tenant"]));
    });
  });

  export const exists = async (userId: User["id"]) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, userId),
            eq(usersTable.tenantId, useTenant().id),
          ),
        )
        .then(R.isNot(R.isEmpty)),
    );

  export async function recordActivity() {
    const month = format(new Date(), "yyyy-MM");
    const userId = assertActor("user").properties.id;

    const pk = DynamoDb.delimitKey(
      Constants.TENANT,
      useTenant().id,
      Constants.MONTH,
      month,
    );
    const sk = DynamoDb.delimitKey(Constants.USER, userId);

    const gsi1pk = DynamoDb.delimitKey(Constants.MONTH, month);
    const gsi1sk = DynamoDb.delimitKey(Constants.USER, userId);

    try {
      await DynamoDb.documentClient().put({
        TableName: Resource.UserActivityTable.name,
        Item: {
          [Constants.PK]: pk,
          [Constants.SK]: sk,
          [Constants.GSI.ONE.PK]: gsi1pk,
          [Constants.GSI.ONE.SK]: gsi1sk,
          [Constants.CREATED_AT]: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(#sk)",
        ExpressionAttributeNames: {
          "#sk": Constants.SK,
        },
      });
    } catch (e) {
      if (
        e instanceof DynamoDBServiceException &&
        e.name === ConditionalCheckFailedException.name
      )
        return console.log("Monthly user activity already recorded");

      console.error("Failed to record monthly user activity", e);
      throw e;
    }
  }

  export async function incrementMonthlyActive(month: string) {
    const pk = DynamoDb.delimitKey(
      Constants.TENANT,
      useTenant().id,
      Constants.MONTH,
      month,
    );
    const sk = DynamoDb.delimitKey(Constants.METADATA);

    const updatedAt = new Date().toISOString();

    try {
      await DynamoDb.documentClient().update({
        TableName: Resource.UserActivityTable.name,
        Key: { pk, sk },
        UpdateExpression: "ADD #user_count :inc SET #updated_at = :updated_at",
        ExpressionAttributeNames: {
          "#user_count": Constants.USER_COUNT,
          "#updated_at": Constants.UPDATED_AT,
        },
        ExpressionAttributeValues: {
          ":inc": 1,
          ":updated_at": updatedAt,
        },
      });
    } catch (e) {
      if (
        e instanceof DynamoDBServiceException &&
        e.name === ConditionalCheckFailedException.name
      ) {
        console.log("First monthly active user for this month:", month);
        await DynamoDb.documentClient().put({
          TableName: Resource.UserActivityTable.name,
          Item: {
            [Constants.PK]: pk,
            [Constants.SK]: sk,
            [Constants.USER_COUNT]: 1,
            [Constants.UPDATED_AT]: updatedAt,
          },
        });
        return;
      }

      console.error("Failed to increment monthly active users", e);
      throw e;
    }
  }

  export async function countMonthlyActive(month: string) {
    const pk = DynamoDb.delimitKey(
      Constants.TENANT,
      useTenant().id,
      Constants.MONTH,
      month,
    );
    const sk = DynamoDb.delimitKey(Constants.METADATA);

    try {
      const output = await DynamoDb.documentClient().get({
        TableName: Resource.UserActivityTable.name,
        Key: { pk, sk },
      });

      const result = v.parse(
        v.pipe(
          v.looseObject({
            [Constants.USER_COUNT]: v.pipe(
              v.number(),
              v.integer(),
              v.minValue(1),
            ),
            [Constants.UPDATED_AT]: v.pipe(v.string(), v.isoTimestamp()),
          }),
          v.transform((input) => ({
            userCount: input[Constants.USER_COUNT],
            updatedAt: input[Constants.UPDATED_AT],
          })),
        ),
        output.Item,
      );

      return result;
    } catch (e) {
      if (
        e instanceof DynamoDBServiceException &&
        e.name === ResourceNotFoundException.name
      ) {
        console.log("No monthly active users for this month:", month);
        return {
          userCount: 0 as const,
          updatedAt: null,
        };
      }

      console.error("Failed to count monthly active users", e);
      throw e;
    }
  }
}
