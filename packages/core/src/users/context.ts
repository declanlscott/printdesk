import * as R from "remeda";

import { Users } from ".";
import { assertActor } from "../actors/context";
import { createTransaction } from "../drizzle/context";
import { Utils } from "../utils";

import type { UserData } from "./sql";

export type UserContext = UserData;
export const UserContext = Utils.createContext<UserContext>("User");

export const useUser = UserContext.use;

export async function withUser<TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) {
  const user = await createTransaction(() =>
    Users.read([assertActor("user").properties.id]).then(R.first()),
  );
  if (!user) throw new Error("user not found");

  return UserContext.with(user, callback);
}
