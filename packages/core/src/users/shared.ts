import * as v from "valibot";

import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const usersTableName = "users";

export const userTypes = ["papercut", "internal"] as const;

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const userSchema = v.object({
  ...tenantTableSchema.entries,
  type: v.picklist(userTypes),
  username: v.string(),
});

export const userProfileMutationNames = [
  "updateUserProfileRole",
  "deleteUserProfile",
  "restoreUserProfile",
] as const;

export const updateUserProfileRoleMutationArgsSchema = v.object({
  id: nanoIdSchema,
  role: v.picklist(userRoles),
  updatedAt: v.date(),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof updateUserProfileRoleMutationArgsSchema
>;

export const deleteUserProfileMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteUserProfileMutationArgs = v.InferOutput<
  typeof deleteUserProfileMutationArgsSchema
>;

export const restoreUserProfileMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreUserProfileMutationArgs = v.InferOutput<
  typeof restoreUserProfileMutationArgsSchema
>;

export const userProfilesTableName = "user_profiles";

export const userProfileSchema = v.object({
  ...tenantTableSchema.entries,
  userId: nanoIdSchema,
  oauth2UserId: v.string(),
  oauth2ProviderId: v.string(),
  role: v.picklist(userRoles),
  name: v.string(),
  email: v.string(),
});
