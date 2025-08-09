import { Schema, Struct } from "effect";

import { DataAccess } from "../data-access2";
import { DatabaseContract } from "../database2/contract";
import { Cost, NanoId } from "../utils2/shared";

import type {
  ActiveBillingAccountCustomerAuthorizationsView,
  ActiveBillingAccountManagerAuthorizationsView,
  ActiveBillingAccountsView,
  BillingAccountCustomerAuthorizationsTable,
  BillingAccountManagerAuthorizationsTable,
  BillingAccountsTable,
} from "./sql";

export namespace BillingAccountsContract {
  export const origins = ["papercut", "internal"] as const;
  export type Origin = (typeof origins)[number];

  export const tableName = "billing_accounts";
  export const table = DatabaseContract.SyncTable<BillingAccountsTable>()(
    tableName,
    Schema.Struct({
      id: NanoId,
      tenantId: NanoId,
      origin: Schema.Literal(...origins),
      name: Schema.String,
      reviewThreshold: Schema.NullOr(
        Schema.transform(Cost, Schema.String, {
          decode: String,
          encode: Number,
          strict: true,
        }),
      ),
      papercutAccountId: Schema.Union(
        Schema.Literal(-1),
        Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
      ),
      ...DatabaseContract.Timestamps.fields,
    }),
    ["read", "update", "delete"],
  );

  export const activeViewName = `active_${tableName}`;
  export const activeView = DatabaseContract.View<ActiveBillingAccountsView>()(
    activeViewName,
    table.Schema,
  );

  export const hasActiveManagerAuthorization = new DataAccess.Function({
    name: "hasActiveBillingAccountManagerAuthorization",
    Args: table.Schema.pick("id"),
  });

  export const hasActiveCustomerAuthorization = new DataAccess.Function({
    name: "hasActiveBillingAccountCustomerAuthorization",
    Args: table.Schema.pick("id"),
  });

  export const hasActiveAuthorization = new DataAccess.Function({
    name: "hasActiveBillingAccountAuthorization",
    Args: table.Schema.pick("id"),
  });

  export const update = new DataAccess.Function({
    name: "updateBillingAccount",
    Args: table.Schema.pick("id", "updatedAt").pipe(
      Schema.extend(
        table.Schema.omit(
          ...Struct.keys(DatabaseContract.TenantTable.fields),
          "name",
          "origin",
          "papercutAccountId",
        ).pipe(Schema.partial),
      ),
    ),
  });

  export const delete_ = new DataAccess.Function({
    name: "deleteBillingAccount",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
  });
}

export namespace BillingAccountCustomerAuthorizationsContract {
  export const tableName = "billing_account_customer_authorizations";
  export const table =
    DatabaseContract.SyncTable<BillingAccountCustomerAuthorizationsTable>()(
      tableName,
      Schema.Struct({
        ...DatabaseContract.TenantTable.fields,
        customerId: NanoId,
        billingAccountId: NanoId,
      }),
      ["read"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    DatabaseContract.View<ActiveBillingAccountCustomerAuthorizationsView>()(
      activeViewName,
      table.Schema,
    );
}

export namespace BillingAccountManagerAuthorizationsContract {
  export const tableName = "billing_account_manager_authorizations";
  export const table =
    DatabaseContract.SyncTable<BillingAccountManagerAuthorizationsTable>()(
      tableName,
      Schema.Struct({
        ...DatabaseContract.TenantTable.fields,
        managerId: NanoId,
        billingAccountId: NanoId,
      }),
      ["create", "read", "delete"],
    );

  export const activeViewName = `active_${tableName}`;
  export const activeView =
    DatabaseContract.View<ActiveBillingAccountManagerAuthorizationsView>()(
      activeViewName,
      table.Schema,
    );

  export const create = new DataAccess.Function({
    name: "createBillingAccountManagerAuthorization",
    Args: table.Schema.omit("deletedAt", "tenantId"),
  });

  export const delete_ = new DataAccess.Function({
    name: "deleteBillingAccountManagerAuthorization",
    Args: Schema.Struct({
      id: NanoId,
      deletedAt: Schema.DateTimeUtc,
    }),
  });
}
