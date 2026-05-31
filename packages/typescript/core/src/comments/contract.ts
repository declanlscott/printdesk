import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { HandlersContract } from "../handlers/contract";
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

  export const isAuthor = new HandlersContract.Handler({
    name: "isCommentAuthor",
    Input: IdOnly.mapFields(
      Struct.assign({ authorId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
    Output: Schema.Void,
  });

  export const canEdit = new HandlersContract.Handler({
    name: "canEditComment",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canDelete = new HandlersContract.Handler({
    name: "canDeleteComment",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const canRestore = new HandlersContract.Handler({
    name: "canRestoreComment",
    Input: IdOnly,
    Output: Schema.Void,
  });

  export const create = new HandlersContract.Handler({
    name: "createComment",
    Input: Table.Dto.mapFields(Struct.omit(["authorId", "deletedAt", "tenantId"])),
    Output: Table.Dto,
  });

  export const edit = new HandlersContract.Handler({
    name: "editComment",
    Input: Table.Dto.mapFields(
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
    Output: Table.Dto,
  });

  export const delete_ = new HandlersContract.Handler({
    name: "deleteComment",
    Input: IdOnly.mapFields(
      Struct.assign(
        Struct.evolve(Struct.pick(Table.Model.fields, ["deletedAt"]), {
          deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[0],
        }),
      ),
    ),
    Output: Table.Dto,
  });

  export const restore = new HandlersContract.Handler({
    name: "restoreComment",
    Input: IdOnly,
    Output: Table.Dto,
  });
}
