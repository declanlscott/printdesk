import { and, eq } from "drizzle-orm";
import * as R from "remeda";

import { assertActor } from "../actors/context";
import { oauth2ProvidersTable } from "../auth/sql";
import { createTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { Utils } from "../utils";
import { userProfilesTable, usersTable } from "./sql";

import type { UserData } from "./sql";

export type UserContext = UserData;
export const UserContext = Utils.createContext<UserContext>("User");

export const useUser = UserContext.use;

export async function withUser<TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) {
  const user = await createTransaction(async (tx) =>
    tx
      .select({
        user: usersTable,
        profile: userProfilesTable,
        oauth2Provider: oauth2ProvidersTable,
      })
      .from(usersTable)
      .innerJoin(
        userProfilesTable,
        and(
          eq(usersTable.id, userProfilesTable.userId),
          eq(usersTable.tenantId, userProfilesTable.tenantId),
        ),
      )
      .innerJoin(
        oauth2ProvidersTable,
        and(
          eq(userProfilesTable.oauth2ProviderId, oauth2ProvidersTable.id),
          eq(userProfilesTable.tenantId, oauth2ProvidersTable.tenantId),
        ),
      )
      .where(
        and(
          eq(usersTable.id, assertActor("user").properties.id),
          eq(usersTable.tenantId, useTenant().id),
        ),
      )
      .then(
        R.map(({ user, profile, oauth2Provider }) => ({
          ...user,
          profile,
          oauth2Provider,
        })),
      )
      .then(R.first()),
  );
  if (!user) throw new Error("user not found");

  return UserContext.with(user, callback);
}
