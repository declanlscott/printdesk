import { Schema } from "effect";

import { Constants } from "../utils/constants";
import { NanoId } from "../utils2/shared";

export const UserSubjectProperties = Schema.Struct({
  id: NanoId,
  tenantId: NanoId,
});
export type UserSubjectProperties = Schema.Schema.Type<
  typeof UserSubjectProperties
>;

export const identityProvidersTableName = "identity_providers";
export const identityProviderKinds = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type IdentityProviderKind = (typeof identityProviderKinds)[number];

export const identityProviderUserGroupsTableName =
  "identity_provider_user_groups";
