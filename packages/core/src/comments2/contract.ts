import { Schema, Struct } from "effect";

import { BillingAccountCustomerAuthorizationsContract } from "../billing-accounts2/contracts";
import { DataAccessContract } from "../data-access2/contract";
import { DatabaseContract } from "../database2/contract";
import { NanoId } from "../utils2";

import type {
  ActiveCommentsView,
  ActiveManagedBillingAccountOrderCommentsView,
  ActivePlacedOrderCommentsView,
  CommentsTable,
} from "./sql";

export namespace CommentsContract {
  export const tableName = "comments";
  export const table = DatabaseContract.SyncTable<CommentsTable>()(
    tableName,
    Schema.Struct({
      ...DatabaseContract.TenantTable.fields,
      orderId: NanoId,
      authorId: NanoId,
      content: Schema.String,
      internal: Schema.Boolean,
    }),
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveCommentsView>()(
    activeViewName,
    table.Schema,
  );

  export const activeManagedBillingAccountOrderViewName = `active_managed_billing_account_order_${tableName}`;
  export const activeManagedBillingAccountOrderView =
    DatabaseContract.View<ActiveManagedBillingAccountOrderCommentsView>()(
      activeManagedBillingAccountOrderViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedManagerId: NanoId }),
      ),
    );

  export const activePlacedOrderViewName = `active_placed_order_${tableName}`;
  export const activePlacedOrderView =
    DatabaseContract.View<ActivePlacedOrderCommentsView>()(
      activePlacedOrderViewName,
      Schema.extend(
        table.Schema,
        BillingAccountCustomerAuthorizationsContract.table.Schema.pick(
          "customerId",
        ),
      ),
    );

  export const isAuthor = new DataAccessContract.Function({
    name: "isCommentAuthor",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Function({
    name: "createComment",
    Args: table.Schema.omit("authorId", "deletedAt", "tenantId"),
    Returns: table.Schema,
  });

  export const update = new DataAccessContract.Function({
    name: "updateComment",
    Args: table.Schema.pick("id", "orderId", "updatedAt").pipe(
      Schema.extend(
        table.Schema.omit(
          ...Struct.keys(DatabaseContract.TenantTable.fields),
          "orderId",
          "authorId",
        ).pipe(Schema.partial),
      ),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteComment",
    Args: Schema.Struct({
      ...table.Schema.pick("id", "orderId").fields,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}
