import * as R from "remeda";

import { Users } from ".";
import { assertActor } from "../actors/context";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";

import type { User } from "./sql";

export type UserContext = User;
export const UserContext = Utils.createContext<UserContext>("User");

export const useUser = UserContext.use;

export const withUser = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  UserContext.with(async () => {
    const user = await Users.read([
      assertActor(Constants.ACTOR_KINDS.USER).properties.id,
    ]).then(R.first());
    if (!user) throw new Error("user not found");

    return user;
  }, callback);
