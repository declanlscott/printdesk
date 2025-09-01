import { Schema, Struct } from "effect";

import { DataAccessContract } from "../data-access2/contract";
import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";

import type {
  LicensesSchema,
  TenantMetadataSchema,
  TenantsSchema,
} from "./schemas";

export namespace LicensesContract {
  export const statuses = ["active", "expired"] as const;
  export type Status = (typeof statuses)[number];

  export const Key = Schema.UUID;

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    key: Key,
    tenantId: TableContract.TenantId,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "active" }),
    ),
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "licenses";
  export const table = TableContract.Internal<LicensesSchema.Table>()(
    tableName,
    DataTransferObject,
  );

  export const isAvailable = new DataAccessContract.Function({
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
    id: TableContract.EntityId,
    subdomain: Subdomain,
    name: Schema.String,
    status: Schema.Literal(...statuses).pipe(
      Schema.optionalWith({ default: () => "setup" }),
    ),
    ...TableContract.Timestamps.fields,
  }) {}
  export const DataTransferStruct = Schema.Struct(DataTransferObject.fields);

  export const tableName = "tenants";
  export const table = TableContract.Sync<TenantsSchema.Table>()(
    tableName,
    DataTransferObject,
    ["read", "update"],
  );

  export const isSubdomainAvailable = new DataAccessContract.Function({
    name: "isTenantSubdomainAvailable",
    Args: DataTransferStruct.pick("subdomain"),
    Returns: Schema.Void,
  });

  export const update = new DataAccessContract.Function({
    name: "updateTenant",
    Args: Schema.extend(
      DataTransferStruct.pick("id", "updatedAt"),
      DataTransferStruct.omit(
        "id",
        ...Struct.keys(TableContract.Timestamps.fields),
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
    tenantId: TableContract.TenantId,
    infraProgramInput: InfraProgramInput,
    apiKey: Schema.String.pipe(Schema.NullOr),
    lastPapercutSyncAt: Schema.DateTimeUtc.pipe(Schema.NullOr),
    ...TableContract.Timestamps.fields,
  }) {}

  export const tableName = "tenant_metadata";
  export const table = TableContract.Internal<TenantMetadataSchema.Table>()(
    tableName,
    DataTransferObject,
  );
}
