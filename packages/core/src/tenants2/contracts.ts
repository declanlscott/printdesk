import { Schema, Struct } from "effect";

import { ColumnsContract } from "../columns2/contract";
import { DataAccessContract } from "../data-access2/contract";
import { TablesContract } from "../tables2/contract";
import { Constants } from "../utils/constants";

import type {
  LicensesSchema,
  TenantMetadataSchema,
  TenantsSchema,
} from "./schemas";

export namespace LicensesContract {
  export const statuses = ["active", "expired"] as const;
  export type Status = (typeof statuses)[number];

  export const Key = Schema.UUID.pipe(Schema.Redacted);

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    key: Key,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "active" }),
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "licenses";
  export const table = TablesContract.makeInternalTable<LicensesSchema.Table>()(
    tableName,
    DataTransferObject,
  );

  export const isAvailable = new DataAccessContract.Procedure({
    name: "isLicenseAvailable",
    Args: DataTransferStruct.pick("key"),
    Returns: Schema.Void,
  });
}

export namespace TenantsContract {
  export const statuses = ["setup", "active", "suspended"] as const;
  export type Status = (typeof statuses)[number];

  export const Subdomain = Schema.String.pipe(
    Schema.pattern(Constants.TENANT_SUBDOMAIN_REGEX),
    Schema.brand("Subdomain"),
  );
  export type Subdomain = typeof Subdomain.Type;

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    ...ColumnsContract.Tenant.fields,
    subdomain: Subdomain,
    name: Schema.String,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "setup" }),
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "tenants";
  export const table = TablesContract.makeTable<TenantsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update"],
  );

  export const isSubdomainAvailable = new DataAccessContract.Procedure({
    name: "isTenantSubdomainAvailable",
    Args: DataTransferStruct.pick("subdomain"),
    Returns: Schema.Void,
  });

  export const edit = new DataAccessContract.Procedure({
    name: "editTenant",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        ...Struct.keys(ColumnsContract.Tenant.fields),
      ).pipe(Schema.partial),
    ),
    Returns: DataTransferObject,
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

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    tenantId: ColumnsContract.TenantId,
    infraProgramInput: InfraProgramInput,
    apiKey: Schema.String.pipe(Schema.Redacted, Schema.NullOr),
    lastPapercutSyncAt: Schema.DateTimeUtc.pipe(Schema.NullOr),
    ...ColumnsContract.Timestamps.fields,
  }) {}

  export const tableName = "tenant_metadata";
  export const table =
    TablesContract.makeInternalTable<TenantMetadataSchema.Table>()(
      tableName,
      DataTransferObject,
    );
}
