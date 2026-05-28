import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { EntityId } from "../utils";

import type {
  ActiveCommentsView,
  ActiveCustomerPlacedOrderCommentsView,
  ActiveManagerAuthorizedSharedAccountOrderCommentsView,
  CommentsTable,
} from "./sql";

export namespace CommentsContract {
  export class Table extends TablesContract.Table<CommentsTable>("comments")(
    {
      ...TablesContract.BaseSyncModel.fields,
      orderId: EntityId,
      authorId: EntityId,
      content: Schema.String,
      internal: Schema.Boolean.pipe(Schema.withDecodingDefaultType(Effect.succeed(false))),
    },
    ["create", "read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveCommentsView>(`active_${Table.name}`)(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveCustomerPlacedOrderView extends TablesContract.View<ActiveCustomerPlacedOrderCommentsView>(
    `active_customer_placed_order_${Table.name}`,
  )({ ...ActiveView.Model.fields, customerId: EntityId }) {}

  export class ActiveManagerAuthorizedSharedAccountOrderView extends TablesContract.View<ActiveManagerAuthorizedSharedAccountOrderCommentsView>(
    `active_manager_authorized_shared_account_order_${Table.name}`,
  )({ ...ActiveView.Model.fields, authorizedManagerId: EntityId }) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  export const isAuthor = new ProceduresContract.Procedure({
    name: "isCommentAuthor",
    Args: IdOnly.mapFields(
      Struct.assign({ authorId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
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
    Args: Table.Dto.mapFields(Struct.omit(["authorId", "deletedAt", "tenantId"])),
    Returns: Table.Dto,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editComment",
    Args: Table.Dto.mapFields(
      Struct.omit([
        ...Struct.keys(TablesContract.BaseModel.fields),
        "orderId",
        "authorId",
        "internal",
      ]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(Table.Model.fields, ["id", "updatedAt", "internal"]), {
            id: (id) => id.from.schema.members[0],
          }),
        ),
      ),
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteComment",
    Args: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(Table.Model.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Returns: Table.Dto,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreComment",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}
