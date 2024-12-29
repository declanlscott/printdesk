import { createContext } from "react";

import type { createClient } from "@openauthjs/openauth/client";
import type { Actor } from "@printworks/core/actors/shared";
import type { UserRole } from "@printworks/core/users/shared";
import type { User, UserWithProfile } from "@printworks/core/users/sql";
import type { ReadTransaction, Replicache } from "replicache";
import type { routePermissions } from "~/lib/access-control";
import type { AuthenticatedEagerRouteId } from "~/types";

export type AuthContext = {
  client: ReturnType<typeof createClient>;
  accessToken: string;
  refreshToken: string;
};

export type ActorContext = Actor;
export const ActorContext = createContext<ActorContext | null>(null);

export type AuthActions = {
  authenticateRoute: (from: string) => Extract<Actor, { type: "user" }>;
  authorizeRoute: <
    TRouteId extends AuthenticatedEagerRouteId,
    TPermission extends (typeof routePermissions)[UserRole][TRouteId],
  >(
    tx: ReadTransaction,
    userId: User["id"],
    routeId: TRouteId,
    ...input: TPermission extends (
      tx: ReadTransaction,
      user: UserWithProfile,
      ...input: infer TInput
    ) => unknown
      ? TInput
      : Array<never>
  ) => Promise<void>;
};
