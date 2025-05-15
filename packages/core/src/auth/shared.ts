import * as v from "valibot";

import { Constants } from "../utils/constants";
import { nanoIdSchema, timestampsSchema } from "../utils/shared";

export const userSubjectPropertiesSchema = v.object({
  id: nanoIdSchema,
  tenantId: nanoIdSchema,
});
export type UserSubjectProperties = v.InferOutput<
  typeof userSubjectPropertiesSchema
>;

export const identityProvidersTableName = "identity_providers";
export const identityProviderKinds = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type IdentityProviderKind = (typeof identityProviderKinds)[number];
export const identityProvidersSchema = v.object({
  id: v.string(),
  tenantId: nanoIdSchema,
  kind: v.picklist(identityProviderKinds),
  ...timestampsSchema.entries,
});

export const identityProviderUserGroupsTableName =
  "identity_provider_user_groups";
export const identityProviderUserGroupsSchema = v.object({
  id: v.string(),
  identityProviderId: v.string(),
  tenantId: nanoIdSchema,
});
