import { AccessControl } from "@printworks/core/access-control";
import { assertActor } from "@printworks/core/actors/context";
import { TRPCError } from "@trpc/server";

import { t } from "~/api/trpc";
import { user } from "~/api/trpc/middleware/user";

import type { Action, Resource } from "@printworks/core/access-control/shared";
import type { PrivateActor } from "@printworks/core/actors/context";

export const authn = <TActorKind extends PrivateActor["kind"]>(
  actorKind: TActorKind,
) =>
  t.middleware(async ({ next }) => {
    try {
      assertActor(actorKind);
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next();
  });

export const authz = (resource: Resource, action: Action) =>
  user.unstable_pipe(async ({ next }) => {
    await AccessControl.enforce([resource, action], {
      Error: TRPCError,
      args: [{ code: "FORBIDDEN" }],
    });

    return next();
  });
