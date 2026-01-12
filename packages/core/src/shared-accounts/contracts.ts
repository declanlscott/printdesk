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

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
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
  }) {}

  export const tableName = "shared_accounts";
  export const table =
    new (TablesContract.makeClass<SharedAccountsSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read", "update", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<SharedAccountsSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountsSchema.ActiveCustomerAuthorizedView>())(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        customerId: ColumnsContract.EntityId,
      }),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountsSchema.ActiveManagerAuthorizedView>())(
      activeManagerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        managerId: ColumnsContract.EntityId,
      }),
    );

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
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
    Args: DataTransferObject.pipe(
      Schema.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
        "name",
        "origin",
        "papercutAccountId",
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
    name: "deleteSharedAccount",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from,
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreSharedAccount",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}

export namespace SharedAccountCustomerAccessContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    customerId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "shared_account_customer_access";
  export const table =
    new (TablesContract.makeClass<SharedAccountCustomerAccessSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<SharedAccountCustomerAccessSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    new (TablesContract.makeVirtualViewClass<SharedAccountCustomerAccessSchema.ActiveAuthorizedView>())(
      activeAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        customerId: ColumnsContract.EntityId,
      }),
    );
}

export namespace SharedAccountManagerAccessContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    managerId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "shared_account_manager_access";
  export const table =
    new (TablesContract.makeClass<SharedAccountManagerAccessSchema.Table>())(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<SharedAccountManagerAccessSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    new (TablesContract.makeVirtualViewClass<SharedAccountManagerAccessSchema.ActiveAuthorizedView>())(
      activeAuthorizedViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountManagerAccessSchema.ActiveCustomerAuthorizedView>())(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        customerId: ColumnsContract.EntityId,
      }),
    );

  const IdOnly = Schema.Struct(
    Struct.evolve(Struct.pick(DataTransferObject.fields, "id"), {
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
    Args: DataTransferObject.pipe(Schema.omit("deletedAt", "tenantId")),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccountManagerAccess",
    Args: Schema.Struct(
      Struct.evolve(Struct.pick(DataTransferObject.fields, "id", "deletedAt"), {
        id: (id) => id.from,
        deletedAt: (deletedAt) => deletedAt.from,
      }),
    ),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreSharedAccountManagerAccess",
    Args: IdOnly,
    Returns: DataTransferObject,
  });
}

export namespace SharedAccountCustomerGroupAccessContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    customerGroupId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}

  export const tableName = "shared_account_customer_group_access";
  export const table =
    new (TablesContract.makeClass<SharedAccountCustomerGroupAccessSchema.Table>())(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    new (TablesContract.makeViewClass<SharedAccountCustomerGroupAccessSchema.ActiveView>())(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    new (TablesContract.makeViewClass<SharedAccountCustomerGroupAccessSchema.ActiveAuthorizedView>())(
      activeAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        memberId: ColumnsContract.EntityId,
      }),
    );
}
