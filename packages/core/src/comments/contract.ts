import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import {
  SharedAccountCustomerAccessContract,
  SharedAccountManagerAccessContract,
} from "../shared-accounts/contracts";
import { TablesContract } from "../tables/contract";

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

  export const tableName = "comments";
  export const table = new (TablesContract.makeClass<CommentsSchema.Table>())(
    tableName,
    DataTransferObject,
    ["create", "read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<CommentsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerPlacedOrderViewName = `active_customer_placed_order_${tableName}`;
  export const activeCustomerPlacedOrderView =
    new (TablesContract.makeViewClass<CommentsSchema.ActiveCustomerPlacedOrderView>())(
      activeCustomerPlacedOrderViewName,
      DataTransferObject.pipe(
        Schema.extend(
          SharedAccountCustomerAccessContract.DataTransferObject.pipe(
            Schema.pick("customerId"),
          ),
        ),
      ),
    );

  export const activeManagerAuthorizedSharedAccountOrderViewName = `active_manager_authorized_shared_account_order_${tableName}`;
  export const activeManagerAuthorizedSharedAccountOrderView =
    new (TablesContract.makeViewClass<CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderView>())(
      activeManagerAuthorizedSharedAccountOrderViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId:
          SharedAccountManagerAccessContract.DataTransferObject.fields
            .managerId,
      }),
    );

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const isAuthor = new ProceduresContract.Procedure({
    name: "isCommentAuthor",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditComment",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteComment",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreComment",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createComment",
    Args: DataTransferObject.pipe(
      Schema.omit("authorId", "deletedAt", "tenantId"),
    ),
    Returns: DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editComment",
    Args: DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "orderId",
        "authorId",
      ),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteComment",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from,
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreComment",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}
