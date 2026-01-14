import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { AuthContract } from "../auth/contract";
import { ColumnsContract } from "../columns/contract";
import { ProceduresContract } from "../procedures/contract";
import { TablesContract } from "../tables/contract";
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

  export const tableName = "licenses";
  export const table =
    new (TablesContract.makeInternalClass<LicensesSchema.Table>())(
      tableName,
      DataTransferObject,
    );

  export const isAvailable = new ProceduresContract.Procedure({
    name: "isLicenseAvailable",
    Args: DataTransferObject.pipe(Schema.pick("key")),
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

  export const tableName = "tenants";
  export const table = new (TablesContract.makeClass<TenantsSchema.Table>())(
    tableName,
    DataTransferObject,
    ["read", "update"],
  );

  export const isSubdomainAvailable = new ProceduresContract.Procedure({
    name: "isTenantSubdomainAvailable",
    Args: DataTransferObject.pipe(Schema.pick("subdomain")),
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editTenant",
    Args: DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.Tenant.fields)),
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
    apiKeyHash: AuthContract.HashFromString.pipe(Schema.NullOr),
    lastPapercutSyncAt: ColumnsContract.NullableTimestamp,
    ...ColumnsContract.Timestamps.fields,
  }) {}

  export const tableName = "tenant_metadata";
  export const table =
    new (TablesContract.makeInternalClass<TenantMetadataSchema.Table>())(
      tableName,
      DataTransferObject,
    );
}
