import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";

import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { Cost, EntityId } from "../utils";

import type {
  ActiveAuthorizedSharedAccountCustomerAccessView,
  ActiveAuthorizedSharedAccountCustomerGroupAccessView,
  ActiveAuthorizedSharedAccountManagerAccessView,
  ActiveCustomerAuthorizedSharedAccountManagerAccessView,
  ActiveCustomerAuthorizedSharedAccountsView,
  ActiveManagerAuthorizedSharedAccountsView,
  ActiveSharedAccountCustomerAccessView,
  ActiveSharedAccountCustomerGroupAccessView,
  ActiveSharedAccountManagerAccessView,
  ActiveSharedAccountsView,
  SharedAccountCustomerAccessTable,
  SharedAccountCustomerGroupAccessTable,
  SharedAccountManagerAccessTable,
  SharedAccountsTable,
} from "./sql";

export namespace SharedAccountsContract {
  export class Table extends TablesContract.Table<SharedAccountsTable>("shared_accounts")(
    {
      ...TablesContract.BaseSyncModel.fields,
      origin: Schema.Literals(["papercut", "internal"]).pipe(
        Schema.withDecodingDefaultType(Effect.succeed("internal")),
      ),
      name: Schema.String,
      reviewThreshold: Cost.pipe(
        Schema.decodeTo(
          Schema.String,
          SchemaTransformation.transform({ decode: String, encode: Number }),
        ),
        Schema.NullOr,
      ),
      papercutAccountId: Schema.Union([
        Schema.Literal(-1),
        Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
      ]).pipe(Schema.withDecodingDefaultType(Effect.succeed(-1))),
    },
    ["read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveSharedAccountsView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveCustomerAuthorizedView extends TablesContract.View<ActiveCustomerAuthorizedSharedAccountsView>(
    `active_customer_authorized_${Table.name}`,
  )({ ...ActiveView.Model.fields, customerId: EntityId }) {}

  export class ActiveManagerAuthorizedView extends TablesContract.View<ActiveManagerAuthorizedSharedAccountsView>(
    `active_manager_authorized_${Table.name}`,
  )({ ...ActiveView.Model.fields, managerId: EntityId }) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  export const isCustomerAuthorized = new ProceduresContract.Procedure({
    name: "isCustomerAuthorizedSharedAccount",
    Args: IdOnly.mapFields(
      Struct.assign({ customerId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isManagerAuthorizedSharedAccount",
    Args: IdOnly.mapFields(
      Struct.assign({ managerId: EntityId.pipe(Schema.OptionFromUndefinedOr) }),
    ),
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditSharedAccount",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteSharedAccount",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreSharedAccount",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editSharedAccount",
    Args: Table.Dto.mapFields(
      Struct.omit([
        ...Struct.keys(TablesContract.BaseModel.fields),
        "name",
        "origin",
        "papercutAccountId",
      ]),
    )
      .mapFields(Struct.map(Schema.optional))
      .mapFields(
        Struct.assign(
          Struct.evolve(Struct.pick(Table.Model.fields, ["id", "updatedAt"]), {
            id: (id) => id.from.schema.members[0],
          }),
        ),
      ),
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccount",
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
    name: "restoreSharedAccount",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}

export namespace SharedAccountCustomerAccessContract {
  export class Table extends TablesContract.Table<SharedAccountCustomerAccessTable>(
    "shared_account_customer_access",
  )({ ...TablesContract.BaseSyncModel.fields, customerId: EntityId, sharedAccountId: EntityId }, [
    "read",
  ]) {}

  export class ActiveView extends TablesContract.View<ActiveSharedAccountCustomerAccessView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveAuthorizedView extends TablesContract.VirtualView<ActiveAuthorizedSharedAccountCustomerAccessView>()(
    `active_authorized_${Table.name}`,
    ActiveView.Model.fields,
  ) {}
}

export namespace SharedAccountManagerAccessContract {
  export class Table extends TablesContract.Table<SharedAccountManagerAccessTable>(
    "shared_account_manager_access",
  )({ ...TablesContract.BaseSyncModel.fields, managerId: EntityId, sharedAccountId: EntityId }, [
    "create",
    "read",
    "delete",
  ]) {}

  export class ActiveView extends TablesContract.View<ActiveSharedAccountManagerAccessView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveAuthorizedView extends TablesContract.VirtualView<ActiveAuthorizedSharedAccountManagerAccessView>()(
    `active_authorized_${Table.name}`,
    Table.Model.fields,
  ) {}

  export class ActiveCustomerAuthorizedView extends TablesContract.View<ActiveCustomerAuthorizedSharedAccountManagerAccessView>(
    `active_customer_authorized_${Table.name}`,
  )({ ...ActiveView.Model.fields, customerId: EntityId }) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.Model.fields, ["id"]), {
      id: (id) => id.from.schema.members[0],
    }),
  );

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteSharedAccountManagerAccess",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreSharedAccountManagerAccess",
    Args: IdOnly,
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createSharedAccountManagerAccess",
    Args: Table.Dto.mapFields(Struct.omit(["deletedAt", "tenantId"])),
    Returns: Table.Dto,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccountManagerAccess",
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
    name: "restoreSharedAccountManagerAccess",
    Args: IdOnly,
    Returns: Table.Dto,
  });
}

export namespace SharedAccountCustomerGroupAccessContract {
  export class Table extends TablesContract.Table<SharedAccountCustomerGroupAccessTable>(
    "shared_account_customer_group_access",
  )(
    {
      ...TablesContract.BaseSyncModel.fields,
      customerGroupId: EntityId,
      sharedAccountId: EntityId,
    },
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<ActiveSharedAccountCustomerGroupAccessView>(
    `active_${Table.name}`,
  )(
    Struct.evolve(Table.Model.fields, {
      deletedAt: (deletedAt) => deletedAt.schema.from.schema.members[0].members[1],
    }),
  ) {}

  export class ActiveAuthorizedView extends TablesContract.View<ActiveAuthorizedSharedAccountCustomerGroupAccessView>(
    `active_authorized_${Table.name}`,
  )({ ...ActiveView.Model.fields, memberId: EntityId }) {}
}
