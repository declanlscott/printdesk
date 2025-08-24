import { Schema } from "effect";

import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";

import type {
  IdentityProvidersSchema,
  IdentityProviderUserGroupsSchema,
} from "./schema";

export namespace IdentityProvidersContract {
  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

  export class DataTransferObject extends Schema.Class<DataTransferObject>(
    "DataTransferObject",
  )({
    id: Schema.String,
    tenantId: TableContract.TenantId,
    kind: Schema.Literal(...kinds),
    ...TableContract.Timestamps.fields,
  }) {}

  export const tableName = "identity_providers";
  export const table = TableContract.NonSync<IdentityProvidersSchema.Table>()(
    tableName,
    DataTransferObject,
    ["create", "read", "delete"],
  );
}

export namespace IdentityProviderGroupsContract {
  export class Row extends Schema.Class<Row>("Row")({
    id: Schema.String,
    identityProviderId: Schema.String,
    tenantId: TableContract.TenantId,
  }) {}

  export const tableName = "identity_provider_user_groups";
  export const table =
    TableContract.Internal<IdentityProviderUserGroupsSchema.Table>()(
      tableName,
      Row,
    );
}
