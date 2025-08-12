import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { DatabaseContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2";

import type { LicensesTable, TenantMetadataTable, TenantsTable } from "./sql";

export namespace TenantsContract {
  export const statuses = ["setup", "active", "suspended"] as const;
  export type Status = (typeof statuses)[number];

  export const Subdomain = Schema.String.pipe(
    Schema.pattern(Constants.TENANT_SUBDOMAIN_REGEX),
  );

  export const tableName = "tenants";
  export const table = DatabaseContract.SyncTable<TenantsTable>()(
    tableName,
    Schema.Struct({
      id: NanoId,
      subdomain: Subdomain,
      name: Schema.String,
      status: Schema.Literal(...statuses),
      ...DatabaseContract.Timestamps.fields,
    }),
    ["read", "update"],
  );

  export const isSubdomainAvailable = new DataAccessContract.Function({
    name: "isTenantSubdomainAvailable",
    Args: table.Schema.pick("subdomain"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateTenant",
    Args: Schema.extend(
      table.Schema.pick("id", "updatedAt"),
      table.Schema.omit(
        "id",
        ...Struct.keys(DatabaseContract.Timestamps.fields),
      ).pipe(Schema.partial),
    ),
    Returns: table.Schema,
  });
}

export namespace LicensesContract {
  export const statuses = ["active", "expired"] as const;
  export type Status = (typeof statuses)[number];

  export const Key = Schema.UUID;
  export const tableName = "licenses";
  export const table = DatabaseContract.NonSyncTable<LicensesTable>()(
    tableName,
    Schema.Struct({
      key: Key,
      tenantId: NanoId,
      status: Schema.Literal(...statuses),
    }),
    [],
  );

  export const isAvailable = new DataAccessContract.Function({
    name: "isLicenseAvailable",
    Args: table.Schema.pick("key"),
    Returns: Schema.Void,
  });
}

export namespace TenantMetadataContract {
  export const Timezone = Schema.Literal(...Intl.supportedValuesOf("timeZone"));

  export const InfraProgramInput = Schema.Struct({
    papercutSyncCronExpression: Schema.String,
    timezone: Timezone,
  });

  export const tableName = "tenant_metadata";
  export const table = DatabaseContract.NonSyncTable<TenantMetadataTable>()(
    tableName,
    Schema.Struct({
      tenantId: NanoId,
      infraProgramInput: InfraProgramInput,
      apiKey: Schema.NullOr(Schema.String),
      lastPapercutSyncAt: Schema.NullOr(Schema.DateTimeUtc),
      ...DatabaseContract.Timestamps.fields,
    }),
    [],
  );
}
