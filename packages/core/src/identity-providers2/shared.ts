import { Schema } from "effect";

import { Timestamps } from "../database2/constructors";
import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

export const identityProvidersTableName = "identity_providers";
export const identityProviderKinds = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type IdentityProviderKind = (typeof identityProviderKinds)[number];
export const IdentityProvider = Schema.Struct({
  id: Schema.String,
  tenantId: NanoId,
  kind: Schema.Literal(...identityProviderKinds),
  ...Timestamps.fields,
});

export const identityProviderUserGroupsTableName =
  "identity_provider_user_groups";
export const IdentityProviderUserGroup = Schema.Struct({
  id: Schema.String,
  identityProviderId: Schema.String,
  tenantId: NanoId,
});
