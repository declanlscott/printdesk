import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { SharedAccountCustomerAuthorizationsContract } from "../shared-accounts2/contracts";
import { TablesContract } from "../tables2/contract";

import type { CommentsSchema } from "./schema";

export namespace CommentsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    orderId: ColumnsContract.EntityId,
    authorId: ColumnsContract.EntityId,
    content: Schema.String,
    internal: Schema.Boolean.pipe(
      Schema.optionalWith({ default: () => false }),
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "comments";
  export const table = TablesContract.makeTable<CommentsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<CommentsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerPlacedOrderViewName = `active_customer_placed_order_${tableName}`;
  export const activeCustomerPlacedOrderView =
    TablesContract.makeView<CommentsSchema.ActiveCustomerPlacedOrderView>()(
      activeCustomerPlacedOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        ...SharedAccountCustomerAuthorizationsContract.DataTransferStruct.pick(
          "customerId",
        ).fields,
      }),
    );

  export const activeManagerAuthorizedSharedAccountOrderViewName = `active_manager_authorized_shared_account_order_${tableName}`;
  export const activeManagerAuthorizedSharedAccountOrderView =
    TablesContract.makeView<CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderView>()(
      activeManagerAuthorizedSharedAccountOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: ColumnsContract.EntityId,
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
          ...Struct.keys(ColumnsContract.Tenant.fields),
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
