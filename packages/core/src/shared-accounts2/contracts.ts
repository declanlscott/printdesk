import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";
import { Cost } from "../utils2";

import type {
  SharedAccountCustomerAuthorizationsSchema,
  SharedAccountManagerAuthorizationsSchema,
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

  export const isCustomerAuthorized = new DataAccessContract.Procedure({
    name: "isCustomerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id").fields,
      customerId: Schema.optional(ColumnsContract.EntityId),
    }),
    Returns: Schema.Void,
  });

  export const isManagerAuthorized = new DataAccessContract.Procedure({
    name: "isManagerAuthorizedSharedAccount",
    Args: Schema.Struct({
      ...DataTransferStruct.pick("id").fields,
      managerId: Schema.optional(ColumnsContract.EntityId),
    }),
    Returns: Schema.Void,
  });

  export const canEdit = new DataAccessContract.Procedure({
    name: "canEditSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const edit = new DataAccessContract.Procedure({
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

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteSharedAccount",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreSharedAccount",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}

export namespace SharedAccountCustomerAuthorizationsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    customerId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_account_customer_authorizations";
  export const table =
    TablesContract.makeTable<SharedAccountCustomerAuthorizationsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountCustomerAuthorizationsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TablesContract.makeVirtualView<SharedAccountCustomerAuthorizationsSchema.ActiveAuthorizedView>()(
      activeAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: ColumnsContract.EntityId,
      }),
    );
}

export namespace SharedAccountManagerAuthorizationsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    managerId: ColumnsContract.EntityId,
    sharedAccountId: ColumnsContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "shared_account_manager_authorizations";
  export const table =
    TablesContract.makeTable<SharedAccountManagerAuthorizationsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TablesContract.makeView<SharedAccountManagerAuthorizationsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TablesContract.makeVirtualView<SharedAccountManagerAuthorizationsSchema.ActiveAuthorizedView>()(
      activeAuthorizedViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TablesContract.makeView<SharedAccountManagerAuthorizationsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.Struct({
        ...DataTransferObject.fields,
        authorizedCustomerId: ColumnsContract.EntityId,
      }),
    );

  export const canDelete = new DataAccessContract.Procedure({
    name: "canDeleteSharedAccountManagerAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const canRestore = new DataAccessContract.Procedure({
    name: "canRestoreSharedAccountManagerAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const create = new DataAccessContract.Procedure({
    name: "createSharedAccountManagerAuthorization",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Procedure({
    name: "deleteSharedAccountManagerAuthorization",
    Args: Schema.Struct({
      id: ColumnsContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });

  export const restore = new DataAccessContract.Procedure({
    name: "restoreSharedAccountManagerAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: DataTransferObject,
  });
}
