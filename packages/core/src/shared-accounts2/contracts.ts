import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { ColumnsContract } from "../columns2/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables2/contract";
import { Cost } from "../utils2";

import type {
  SharedAccountCustomerAccessSchema,
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
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_accounts";
  export const table = TablesContract.makeTable<SharedAccountsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TablesContract.makeView<SharedAccountsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: ColumnsContract.EntityId,
      }),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TablesContract.makeView<SharedAccountsSchema.ActiveManagerAuthorizedView>()(
      activeManagerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedManagerId: ColumnsContract.EntityId,
      }),
    );

  export const isCustomerAuthorized = new ProceduresContract.Procedure({
    name: "isCustomerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id").fields,
      customerId: Schema.optional(ColumnsContract.EntityId),
    }),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new ProceduresContract.Procedure({
    name: "isManagerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id").fields,
      managerId: Schema.optional(ColumnsContract.EntityId),
    }),
    Returns: Schema.Void,
  });

  export const canEdit = new ProceduresContract.Procedure({
    name: "canEditSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editSharedAccount",
    Args: DataTransferStruct.pick("id", "updatedAt").pipe(
      Schema.extend(
        DataTransferStruct.omit(
          ...Struct.keys(ColumnsContract.Tenant.fields),
          "name",
          "origin",
          "papercutAccountId",
        ).pipe(Schema.partial),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccount",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreSharedAccount",
    Args: DataTransferStruct.pick("id"),
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
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_account_customer_access";
  export const table =
    TablesContract.makeTable<SharedAccountCustomerAccessSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountCustomerAccessSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TablesContract.makeVirtualView<SharedAccountCustomerAccessSchema.ActiveAuthorizedView>()(
      activeAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: ColumnsContract.EntityId,
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
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_account_manager_access";
  export const table =
    TablesContract.makeTable<SharedAccountManagerAccessSchema.Table>()(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountManagerAccessSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TablesContract.makeVirtualView<SharedAccountManagerAccessSchema.ActiveAuthorizedView>()(
      activeAuthorizedViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TablesContract.makeView<SharedAccountManagerAccessSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: ColumnsContract.EntityId,
      }),
    );

  export const canDelete = new ProceduresContract.Procedure({
    name: "canDeleteSharedAccountManagerAccess",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new ProceduresContract.Procedure({
    name: "canRestoreSharedAccountManagerAccess",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new ProceduresContract.Procedure({
    name: "createSharedAccountManagerAccess",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const delete_ = new ProceduresContract.Procedure({
    name: "deleteSharedAccountManagerAccess",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new ProceduresContract.Procedure({
    name: "restoreSharedAccountManagerAccess",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
