import { AccessControl } from "@printdesk/core/access-control";
import { assertActor } from "@printdesk/core/actors/context";
import { ServerErrors } from "@printdesk/core/errors";
import { TRPCError } from "@trpc/server";

import { t } from "~/api/trpc";
import { user } from "~/api/trpc/middleware/user";

import type { Action, Resource } from "@printdesk/core/access-control/shared";

export const authn = t.middleware(async (opts) => {
  if (!opts.meta)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing actor metadata.",
    });

  if (opts.meta.actor === "public")
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Expected private actor.",
    });

  try {
    assertActor(opts.meta.actor);
  } catch (e) {
    throw new TRPCError(
      e instanceof ServerErrors.InvalidActor
        ? { code: "UNAUTHORIZED", ...e }
        : {
            code: "INTERNAL_SERVER_ERROR",
            message:
              e instanceof Error ? e.message : "An unexpected error occurred.",
          },
    );
  }

  return opts.next(opts);
});

export const authz = (resource: Resource, action: Action) =>
  user.unstable_pipe(async (opts) => {
    await AccessControl.enforce([resource, action], {
      Error: TRPCError,
      args: [
        {
          code: "FORBIDDEN",
          message: `Access denied for action "${action}" on resource "${resource}".`,
        },
      ],
    });

    return opts.next(opts);
  });
