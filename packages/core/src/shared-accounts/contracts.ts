import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
import { Cost } from "../utils";

import type {
  SharedAccountCustomerAccessSchema,
  SharedAccountCustomerGroupAccessSchema,
  SharedAccountManagerAccessSchema,
  SharedAccountsSchema,
} from "./schemas";

export namespace SharedAccountsContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export class Table extends TablesContract.Table<SharedAccountsSchema.Table>(
    "shared_accounts",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("SharedAccount")({
      origin: Schema.Literal(...origins).pipe(
        Schema.optionalWith({ default: () => "internal" }),
      ),
      name: Schema.String,
      reviewThreshold: Schema.transform(Cost, Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }).pipe(Schema.NullOr),
      papercutAccountId: Schema.Union(
        Schema.Literal(-1),
        Schema.NonNegativeInt,
      ).pipe(Schema.optionalWith({ default: () => -1 })),
    }) {},
    ["read", "update", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<SharedAccountsSchema.ActiveView>(
    "active_shared_accounts",
  )(
    class Dto extends Schema.Class<Dto>("ActiveSharedAccount")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveCustomerAuthorizedView extends TablesContract.View<SharedAccountsSchema.ActiveCustomerAuthorizedView>(
    "active_customer_authorized_shared_accounts",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveCustomerAuthorizedSharedAccount",
    )({ customerId: ColumnsContract.EntityId }) {},
  ) {}

  export class ActiveManagerAuthorizedView extends TablesContract.View<SharedAccountsSchema.ActiveManagerAuthorizedView>(
    "active_manager_authorized_shared_accounts",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveManagerAuthorizedSharedAccount",
    )({ managerId: ColumnsContract.EntityId }) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
      id: (id) => id.from,
    }),
  );

  export const isCustomerAuthorized = new ProceduresContract.Procedure({
    name: "isCustomerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...IdOnly.fields,
      customerId: ColumnsContract.EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isManagerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...IdOnly.fields,
      managerId: ColumnsContract.EntityId.pipe(Schema.OptionFromUndefinedOr),
    }),
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
    Args: Table.DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.BaseEntity.fields),
        "name",
        "origin",
        "papercutAccountId",
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
    name: "deleteSharedAccount",
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
    name: "restoreSharedAccount",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}

export namespace SharedAccountCustomerAccessContract {
  export class Table extends TablesContract.Table<SharedAccountCustomerAccessSchema.Table>(
    "shared_account_customer_access",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>(
      "SharedAccountCustomerAccess",
    )({
      customerId: ColumnsContract.EntityId,
      sharedAccountId: ColumnsContract.EntityId,
    }) {},
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<SharedAccountCustomerAccessSchema.ActiveView>(
    "active_shared_account_customer_access",
  )(
    class Dto extends Schema.Class<Dto>("ActiveSharedAccountCustomerAccess")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveAuthorizedView extends TablesContract.VirtualView<SharedAccountCustomerAccessSchema.ActiveAuthorizedView>()(
    `active_authorized_${Table.name}`,
    ActiveView.DataTransferObject,
  ) {}
}

export namespace SharedAccountManagerAccessContract {
  export class Table extends TablesContract.Table<SharedAccountManagerAccessSchema.Table>(
    "shared_account_manager_access",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>(
      "SharedAccountManagerAccess",
    )({
      managerId: ColumnsContract.EntityId,
      sharedAccountId: ColumnsContract.EntityId,
    }) {},
    ["create", "read", "delete"],
  ) {}

  export class ActiveView extends TablesContract.View<SharedAccountManagerAccessSchema.ActiveView>(
    "active_shared_account_manager_access",
  )(
    class Dto extends Schema.Class<Dto>("ActiveSharedAccountManagerAccess")(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveAuthorizedView extends TablesContract.VirtualView<SharedAccountManagerAccessSchema.ActiveAuthorizedView>()(
    `active_authorized_${Table.name}`,
    Table.DataTransferObject,
  ) {}

  export class ActiveCustomerAuthorizedView extends TablesContract.View<SharedAccountManagerAccessSchema.ActiveCustomerAuthorizedView>(
    "active_customer_authorized_shared_account_manager_access",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveCustomerAuthorizedSharedAccountManagerAccess",
    )({ customerId: ColumnsContract.EntityId }) {},
  ) {}

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(Table.DataTransferObject.fields, "id"), {
      id: (id) => id.from,
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
    Args: Table.DataTransferObject.pipe(Schema.omit("deletedAt", "tenantId")),
    Returns: Table.DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccountManagerAccess",
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
    name: "restoreSharedAccountManagerAccess",
    Args: IdOnly,
    Returns: Table.DataTransferObject,
  });
}

export namespace SharedAccountCustomerGroupAccessContract {
  export class Table extends TablesContract.Table<SharedAccountCustomerGroupAccessSchema.Table>(
    "shared_account_customer_group_access",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>(
      "SharedAccountCustomerGroupAccess",
    )({
      customerGroupId: ColumnsContract.EntityId,
      sharedAccountId: ColumnsContract.EntityId,
    }) {},
    ["read"],
  ) {}

  export class ActiveView extends TablesContract.View<SharedAccountCustomerGroupAccessSchema.ActiveView>(
    "active_shared_account_customer_group_access",
  )(
    class Dto extends Table.DataTransferObject.extend<Dto>(
      "ActiveSharedAccountCustomerGroupAccess",
    )(
      Struct.evolve(Table.DataTransferObject.fields, {
        deletedAt: (deletedAt) => deletedAt.from.members[1],
      }),
    ) {},
  ) {}

  export class ActiveAuthorizedView extends TablesContract.View<SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedView>(
    "active_authorized_shared_account_customer_group_access",
  )(
    class Dto extends ActiveView.DataTransferObject.extend<Dto>(
      "ActiveAuthorizedSharedAccountCustomerGroupAccess",
    )({ memberId: ColumnsContract.EntityId }) {},
  ) {}
}
