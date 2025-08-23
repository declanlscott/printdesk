import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
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
  export const table = TableContract.Sync<TenantsTable>()(
    tableName,
    Schema.Struct({
      id: NanoId,
      subdomain: Subdomain,
      name: Schema.String,
      status: Schema.optionalWith(Schema.Literal(...statuses), {
        default: () => "setup",
      }),
      ...TableContract.Timestamps.fields,
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
        ...Struct.keys(TableContract.Timestamps.fields),
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
  export const table = TableContract.NonSync<LicensesTable>()(
    tableName,
    Schema.Struct({
      key: Key,
      tenantId: NanoId,
      status: Schema.optionalWith(Schema.Literal(...statuses), {
        default: () => "active",
      }),
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

  export class InfraProgramInput extends Schema.Class<InfraProgramInput>(
    "InfraProgramInput",
  )({
    papercutSyncCronExpression: Schema.String,
    timezone: Timezone,
  }) {}

  export const tableName = "tenant_metadata";
  export const table = TableContract.NonSync<TenantMetadataTable>()(
    tableName,
    Schema.Struct({
      tenantId: NanoId,
      infraProgramInput: InfraProgramInput,
      apiKey: Schema.NullOr(Schema.String),
      lastPapercutSyncAt: Schema.NullOr(Schema.DateTimeUtc),
      ...TableContract.Timestamps.fields,
    }),
    [],
  );
}
