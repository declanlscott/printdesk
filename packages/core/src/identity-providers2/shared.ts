import { Schema } from "effect";

import { NonSyncTable, Timestamps } from "../database2/shared";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

import type {
  IdentityProvidersTable,
  IdentityProviderUserGroupsTable,
} from "./sql";

export const identityProviderKinds = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type IdentityProviderKind = (typeof identityProviderKinds)[number];

export const identityProvidersTableName = "identity_providers";
export const identityProviders = NonSyncTable<IdentityProvidersTable>()(
  identityProvidersTableName,
  Schema.Struct({
    id: Schema.String,
    tenantId: NanoId,
    kind: Schema.Literal(...identityProviderKinds),
    ...Timestamps.fields,
  }),
  ["create", "read", "delete"],
);

export const identityProviderUserGroupsTableName =
  "identity_provider_user_groups";
export const identityProviderUserGroups =
  NonSyncTable<IdentityProviderUserGroupsTable>()(
    identityProviderUserGroupsTableName,
    Schema.Struct({
      id: Schema.String,
      identityProviderId: Schema.String,
      tenantId: NanoId,
    }),
    [],
  );
