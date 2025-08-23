import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Cost } from "../utils2";

import type {
  ActiveBillingAccountCustomerAuthorizationsView,
  ActiveBillingAccountManagerAuthorizationsView,
  ActiveBillingAccountsView,
  ActiveCustomerAuthorizedBillingAccountManagerAuthorizationsView,
  ActiveCustomerAuthorizedBillingAccountsView,
  ActiveManagerAuthorizedBillingAccountsView,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountManagerAuthorizationsTable,
  BillingAccountsTable,
} from "./sql";

export namespace BillingAccountsContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export const tableName = "billing_accounts";
  export const table = TableContract.Sync<BillingAccountsTable>()(
    tableName,
    Schema.Struct({
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
    }),
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = TableContract.View<ActiveBillingAccountsView>()(
    activeViewName,
    table.Schema,
  );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<ActiveCustomerAuthorizedBillingAccountsView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedCustomerId: TableContract.EntityId }),
      ),
    );

  export const activeManagerAuthorizedViewName = `active_manager_authorized_${tableName}`;
  export const activeManagerAuthorizedView =
    TableContract.View<ActiveManagerAuthorizedBillingAccountsView>()(
      activeManagerAuthorizedViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedManagerId: TableContract.EntityId }),
      ),
    );

  export const hasActiveAuthorization = new DataAccessContract.Function({
    name: "hasActiveBillingAccountAuthorization",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const hasActiveCustomerAuthorization = new DataAccessContract.Function(
    {
      name: "hasActiveBillingAccountCustomerAuthorization",
      Args: Schema.extend(
        table.Schema.pick("id"),
        Schema.Struct({
          customerId: Schema.optional(TableContract.EntityId),
        }),
      ),
      Returns: Schema.Void,
    },
  );

  export const hasActiveManagerAuthorization = new DataAccessContract.Function({
    name: "hasActiveBillingAccountManagerAuthorization",
    Args: table.Schema.pick("id"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateBillingAccount",
    Args: table.Schema.pick("id", "updatedAt").pipe(
      Schema.extend(
        table.Schema.omit(
          ...Struct.keys(TableContract.Tenant.fields),
          "name",
          "origin",
          "papercutAccountId",
        ).pipe(Schema.partial),
      ),
    ),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteBillingAccount",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}

export namespace BillingAccountCustomerAuthorizationsContract {
  export const tableName = "billing_account_customer_authorizations";
  export const table =
    TableContract.Sync<BillingAccountCustomerAuthorizationsTable>()(
      tableName,
      Schema.Struct({
        ...TableContract.Tenant.fields,
        customerId: TableContract.EntityId,
        billingAccountId: TableContract.EntityId,
      }),
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<ActiveBillingAccountCustomerAuthorizationsView>()(
      activeViewName,
      table.Schema,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TableContract.VirtualView<ActiveBillingAccountCustomerAuthorizationsView>()(
      activeAuthorizedViewName,
      table.Schema,
    );
}

export namespace BillingAccountManagerAuthorizationsContract {
  export const tableName = "billing_account_manager_authorizations";
  export const table =
    TableContract.Sync<BillingAccountManagerAuthorizationsTable>()(
      tableName,
      Schema.Struct({
        ...TableContract.Tenant.fields,
        managerId: TableContract.EntityId,
        billingAccountId: TableContract.EntityId,
      }),
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    TableContract.View<ActiveBillingAccountManagerAuthorizationsView>()(
      activeViewName,
      table.Schema,
    );

  export const activeAuthorizedViewName = `active_authorized_${tableName}`;
  export const activeAuthorizedView =
    TableContract.VirtualView<ActiveBillingAccountManagerAuthorizationsView>()(
      activeAuthorizedViewName,
      table.Schema,
    );

  export const activeCustomerAuthorizedViewName = `active_customer_authorized_${tableName}`;
  export const activeCustomerAuthorizedView =
    TableContract.View<ActiveCustomerAuthorizedBillingAccountManagerAuthorizationsView>()(
      activeCustomerAuthorizedViewName,
      Schema.extend(
        table.Schema,
        Schema.Struct({ authorizedCustomerId: TableContract.EntityId }),
      ),
    );

  export const create = new DataAccessContract.Function({
    name: "createBillingAccountManagerAuthorization",
    Args: table.Schema.omit("deletedAt", "tenantId"),
    Returns: table.Schema,
  });

  export const delete_ = new DataAccessContract.Function({
    name: "deleteBillingAccountManagerAuthorization",
    Args: Schema.Struct({
      id: TableContract.EntityId,
      deletedAt: Schema.DateTimeUtc,
    }),
    Returns: table.Schema,
  });
}
