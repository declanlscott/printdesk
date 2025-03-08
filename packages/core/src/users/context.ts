import * as R from "remeda";

import { Users } from ".";
import { assertActor } from "../actors/context";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";

import type { User } from "./sql";

export type UserContext = User;
export const UserContext = Utils.createContext<UserContext>("User");

export const useUser = UserContext.use;

export async function withUser<TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) {
  const user = await Users.read([
    assertActor(Constants.ACTOR_TYPES.USER).properties.id,
  ]).then(R.first());
  if (!user) throw new Error("user not found");

  return UserContext.with(user, callback);
}
