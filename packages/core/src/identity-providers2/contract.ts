import { Schema } from "effect";

import { DatabaseContract } from "../database2/contract";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

import type {
  IdentityProvidersTable,
  IdentityProviderUserGroupsTable,
} from "./sql";

export namespace IdentityProvidersContract {
  export const kinds = [Constants.ENTRA_ID, Constants.GOOGLE] as const;
  export type Kind = (typeof kinds)[number];

  export const tableName = "identity_providers";
  export const table = DatabaseContract.NonSyncTable<IdentityProvidersTable>()(
    tableName,
    Schema.Struct({
      id: Schema.String,
      tenantId: NanoId,
      kind: Schema.Literal(...kinds),
      ...DatabaseContract.Timestamps.fields,
    }),
    ["create", "read", "delete"],
  );
}

export namespace IdentityProviderGroupsContract {
  export const tableName = "identity_provider_user_groups";
  export const table =
    DatabaseContract.NonSyncTable<IdentityProviderUserGroupsTable>()(
      tableName,
      Schema.Struct({
        id: Schema.String,
        identityProviderId: Schema.String,
        tenantId: NanoId,
      }),
      [],
    );
}
