import { AccessControl } from "@printdesk/core/access-control";
import { assertActor } from "@printdesk/core/actors/context";
import { ServerErrors } from "@printdesk/core/errors";
import { TRPCError } from "@trpc/server";

import { t } from "~/api/trpc";

import type { Action, Resource } from "@printdesk/core/access-control/shared";

export const authn = t.middleware(async (opts) => {
  const meta = opts.meta;

  if (!meta || meta.actor === "public")
    throw new TRPCError(
      meta
        ? { code: "UNAUTHORIZED", message: "Expected private actor." }
        : { code: "INTERNAL_SERVER_ERROR", message: "Missing actor metadata." },
    );

  try {
    assertActor(meta.actor);
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
  t.middleware(async (opts) => {
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
