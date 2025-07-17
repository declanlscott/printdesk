import { Schema } from "effect";

import { TenantTable } from "../database2/constructors";
import { NanoId } from "../utils2/shared";

export const usersTableName = "users";

export const userOrigins = ["papercut", "internal"] as const;
export type UserOrigin = (typeof userOrigins)[number];

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const User = Schema.Struct({
  ...TenantTable.fields,
  origin: Schema.Literal(...userOrigins),
  username: Schema.String,
  subjectId: Schema.String,
  identityProviderId: Schema.String,
  role: Schema.Literal(...userRoles),
  name: Schema.String,
  email: Schema.String,
});

export const UpdateUser = User.pick("id", "role", "updatedAt");

export const DeleteUser = Schema.Struct({
  id: NanoId,
  deletedAt: Schema.Date,
});

export const RestoreUser = Schema.Struct({
  id: NanoId,
});
