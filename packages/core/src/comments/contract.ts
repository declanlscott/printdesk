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
  export class Table extends TablesContract.Table<CommentsSchema.Table>(
    "comments",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("Comment")({
      orderId: ColumnsContract.EntityId,
      authorId: ColumnsContract.EntityId,
      content: Schema.String,
      internal: Schema.Boolean.pipe(
        Schema.optionalWith({ default: () => false }),
      ),
    }) {},
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<CommentsSchema.ActiveView>(
    "active_comments",
  )(
    class Dto extends Schema.Class<Dto>("ActiveComment")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveCustomerPlacedOrderView extends TablesContract.View<CommentsSchema.ActiveCustomerPlacedOrderView>(
    "active_customer_placed_order_comments",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveCustomerPlacedOrderComment",
    )(
      Struct.pick(
        SharedAccountCustomerAccessContract.Table.DataTransferObject.fields,
        "customerId",
      ),
    ) {},
  ) {}

  export class ActiveManagerAuthorizedSharedAccountOrderView extends TablesContract.View<CommentsSchema.ActiveManagerAuthorizedSharedAccountOrderView>(
    "active_manager_authorized_shared_account_order_comments",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveManagerAuthorizedSharedAccountOrderComment",
    )({
      authorizedManagerId:
        SharedAccountManagerAccessContract.Table.DataTransferObject.fields
          .managerId,
    }) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
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
    Args: Table.DataTransferObject.pipe(
      Schema.omit("authorId", "deletedAt", "tenantId"),
    ),
    Returns: Table.DataTransferObject,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editComment",
    Args: Table.DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.BaseEntity.fields),
        "orderId",
        "authorId",
      ),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(Table.DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteComment",
    Args: Schema.Struct(
      Struct.evolve(
        Struct.pick(Table.DataTransferObject.fields, "id", "deletedAt"),
        {
          id: (id) => id.from,
          deletedAt: (deletedAt) => deletedAt.from.members[0],
        },
      ),
    ),
    Returns: Table.DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreComment",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}
