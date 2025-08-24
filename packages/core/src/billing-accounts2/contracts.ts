import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Cost } from "../utils2";

import type {
  BillingAccountCustomerAuthorizationsSchema,
  BillingAccountManagerAuthorizationsSchema,
  BillingAccountsSchema,
} from "./schemas";

export namespace BillingAccountsContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    origin: Schema.optionalWith(Schema.Literal(...origins), {
      default: () => "internal",
    }),
    name: Schema.String,
    reviewThreshold: Schema.NullOr(
      Schema.transform(Cost, Schema.String, {
        decode: String,
        encode: Number,
        strict: true,
      }),
    ),
    papercutAccountId: Schema.optionalWith(
      Schema.Union(
        Schema.Literal(-1),
        Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      ),
      { default: () => -1 },
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "billing_accounts";
  export const table = TableContract.Sync<BillingAccountsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<BillingAccountsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<BillingAccountsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedCustomerId: TableContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TableContract.View<BillingAccountsSchema.ActiveManagerAuthorizedView>()(
      activeManagerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const hasActiveAuthorization = new DataAccessContract.Function({
    name: "hasActiveBillingAccountAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const hasActiveCustomerAuthorization = new DataAccessContract.Function(
    {
      name: "hasActiveBillingAccountCustomerAuthorization",
      Args: Schema.extend(
        DataTransferStruct.pick("id"),
        Schema.Struct({
          customerId: Schema.optional(TableContract.EntityId),
        }),
      ),
      Returns: Schema.Void,
    },
  );

  export const hasActiveManagerAuthorization = new DataAccessContract.Function({
    name: "hasActiveBillingAccountManagerAuthorization",
    Args: DataTransferStruct.pick("id"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateBillingAccount",
    Args: DataTransferStruct.pick("id", "updatedAt").pipe(
      Schema.extend(
        DataTransferStruct.omit(
          ...Struct.keys(TableContract.Tenant.fields),
          "name",
          "origin",
          "papercutAccountId",
        ).pipe(Schema.partial),
      ),
    ),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteBillingAccount",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}

export namespace BillingAccountCustomerAuthorizationsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    customerId: TableContract.EntityId,
    billingAccountId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "billing_account_customer_authorizations";
  export const table =
    TableContract.Sync<BillingAccountCustomerAuthorizationsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<BillingAccountCustomerAuthorizationsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TableContract.VirtualView<BillingAccountCustomerAuthorizationsSchema.ActiveView>()(
      activeAuthorizedViewName,
      DataTransferObject,
    );
}

export namespace BillingAccountManagerAuthorizationsContract {
  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...TableContract.Tenant.fields,
    managerId: TableContract.EntityId,
    billingAccountId: TableContract.EntityId,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "billing_account_manager_authorizations";
  export const table =
    TableContract.Sync<BillingAccountManagerAuthorizationsSchema.Table>()(
      tableName,
      DataTransferObject,
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<BillingAccountManagerAuthorizationsSchema.ActiveView>()(
      activeViewName,
      DataTransferObject,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TableContract.VirtualView<BillingAccountManagerAuthorizationsSchema.ActiveView>()(
      activeAuthorizedViewName,
      DataTransferObject,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<BillingAccountManagerAuthorizationsSchema.ActiveCustomerAuthorizedView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        DataTransferObject,
        Schema.Struct({ authorizedCustomerId: TableContract.EntityId }),
      ),
    );

  export const create = new DataAccessContract.Function({
    name: "createBillingAccountManagerAuthorization",
    Args: DataTransferStruct.omit("deletedAt", "tenantId"),
    Returns: DataTransferObject,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteBillingAccountManagerAuthorization",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: DataTransferObject,
  });
}
