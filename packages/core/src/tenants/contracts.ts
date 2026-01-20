import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { CryptoContract } from "../auth/contracts";
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

  export class Table extends TablesContract.InternalTable<LicensesSchema.Table>(
    "licenses",
  )(
    class Record extends ColumnsContract.BaseEntity.extend<Record>("License")({
      key: Key,
      status: Schema.Literal(...statuses).pipe(
        Schema.optionalWith({ default: () => "active" }),
      ),
    }) {},
  ) {}

  export const isAvailable = new ProceduresContract.Procedure({
    name: "isLicenseAvailable",
    Args: Table.Record.pipe(Schema.pick("key")),
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

  export class Table extends TablesContract.Table<TenantsSchema.Table>(
    "tenants",
  )(
    class Dto extends ColumnsContract.BaseEntity.extend<Dto>("Tenant")({
      subdomain: Subdomain,
      name: Schema.String,
      status: Schema.Literal(...statuses).pipe(
        Schema.optionalWith({ default: () => "setup" }),
      ),
    }) {},
    ["read", "update"],
  ) {}

  export const isSubdomainAvailable = new ProceduresContract.Procedure({
    name: "isTenantSubdomainAvailable",
    Args: Table.DataTransferObject.pipe(Schema.pick("subdomain")),
    Returns: Schema.Void,
  });

  export const edit = new ProceduresContract.Procedure({
    name: "editTenant",
    Args: Table.DataTransferObject.pipe(
      Schema.omit(...Struct.keys(ColumnsContract.BaseEntity.fields)),
      Schema.partial,
      Schema.extend(
        Schema.Struct(
          Struct.evolve(
            Struct.pick(Table.DataTransferObject.fields, "id", "updatedAt"),
            { id: (id) => id.from },
          ),
        ),
      ),
    ),
    Returns: Table.DataTransferObject,
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

  export class Table extends TablesContract.InternalTable<TenantMetadataSchema.Table>(
    "tenant_metadata",
  )(
    class Record extends ColumnsContract.Timestamps.extend<Record>(
      "TenantMetadata",
    )({
      tenantId: ColumnsContract.TenantId,
      infraProgramInput: InfraProgramInput,
      apiKeyHash: CryptoContract.HashFromString.pipe(Schema.NullOr),
      lastPapercutSyncAt: ColumnsContract.NullableTimestamp,
    }) {},
  ) {}
}
