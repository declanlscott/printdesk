import * as v from "valibot";

import { nanoIdSchema, tenantTableSchema } from "../utils/shared";

export const usersTableName = "users";

export const userTypes = ["papercut", "internal"] as const;
export type UserType = (typeof userTypes)[number];

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
  oauth2UserId: v.string(),
  oauth2ProviderId: v.string(),
  role: v.picklist(userRoles),
  name: v.string(),
  email: v.string(),
});

export const userMutationNames = [
  "updateUserRole",
  "deleteUser",
  "restoreUser",
] as const;

export const updateUserRoleMutationArgsSchema = v.object({
  id: nanoIdSchema,
  role: v.picklist(userRoles),
  updatedAt: v.date(),
});
export type UpdateUserRoleMutationArgs = v.InferOutput<
  typeof updateUserRoleMutationArgsSchema
>;

export const deleteUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
  deletedAt: v.date(),
});
export type DeleteUserMutationArgs = v.InferOutput<
  typeof deleteUserMutationArgsSchema
>;

export const restoreUserMutationArgsSchema = v.object({
  id: nanoIdSchema,
});
export type RestoreUserMutationArgs = v.InferOutput<
  typeof restoreUserMutationArgsSchema
>;
