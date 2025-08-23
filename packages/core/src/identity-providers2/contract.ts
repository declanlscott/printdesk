import { Schema } from "effect";

import { TableContract } from "../database2/contract";
import { Constants } from "../utils/constants";

import type {
  IdentityProvidersTable,
  IdentityProviderUserGroupsTable,
} from "./sql";

export namespace IdentityProvidersContract {
  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

  export const tableName = "identity_providers";
  export const table = TableContract.NonSync<IdentityProvidersTable>()(
    tableName,
    Schema.Struct({
      id: Schema.String,
      tenantId: TableContract.TenantId,
      kind: Schema.Literal(...kinds),
      ...TableContract.Timestamps.fields,
    }),
    ["create", "read", "delete"],
  );
}

export namespace IdentityProviderGroupsContract {
  export const tableName = "identity_provider_user_groups";
  export const table = TableContract.NonSync<IdentityProviderUserGroupsTable>()(
    tableName,
    Schema.Struct({
      id: Schema.String,
      identityProviderId: Schema.String,
      tenantId: TableContract.TenantId,
    }),
    [],
  );
}
