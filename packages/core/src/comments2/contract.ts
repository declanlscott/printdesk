import { Schema, Struct } from "effect";

import { BillingAccountCustomerAuthorizationsContract } from "../billing-accounts2/contracts";
import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";

import type { CommentsSchema } from "./schema";

export namespace CommentsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    orderId: TableContract.EntityId,
    authorId: TableContract.EntityId,
    content: Schema.String,
    internal: Schema.Boolean.pipe(
      Schema.optionalWith({ default: () => false }),
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "comments";
  export const table = TableContract.Sync<CommentsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<CommentsSchema.ActiveView>()(
    activeViewName,
    DataTransferObject,
  );

  export const activeManagedBillingAccountOrderViewName = `active_managed_billing_account_order_${tableName}`;
  export const activeManagedBillingAccountOrderView =
    TableContract.View<CommentsSchema.ActiveManagedBillingAccountOrderView>()(
      activeManagedBillingAccountOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: TableContract.EntityId,
      }),
    );

  export const activePlacedOrderViewName = `active_placed_order_${tableName}`;
  export const activePlacedOrderView =
    TableContract.View<CommentsSchema.ActivePlacedOrderView>()(
      activePlacedOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        ...BillingAccountCustomerAuthorizationsContract.DataTransferStruct.pick(
          "customerId",
        ).fields,
      }),
    );

  export const isAuthor = new DataAccessContract.Function({
    name: "isCommentAuthor",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Function({
    name: "createComment",
    Args: DataTransferStruct.omit("authorId", "deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const update = new DataAccessContract.Function({
    name: "updateComment",
    Args: DataTransferStruct.pick("id", "orderId", "updatedAt").pipe(
      Schema.extend(
        DataTransferStruct.omit(
          ...Struct.keys(TableContract.Tenant.fields),
          "orderId",
          "authorId",
        ).pipe(Schema.partial),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteComment",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id", "orderId").fields,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
