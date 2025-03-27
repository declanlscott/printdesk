import { AccessControl } from "@printworks/core/access-control";
import { assertActor } from "@printworks/core/actors/context";
import { ServerErrors } from "@printworks/core/errors";
import { TRPCError } from "@trpc/server";

import { t } from "~/api/trpc";
import { isOfKind } from "~/api/trpc/meta";
import { user } from "~/api/trpc/middleware/user";

export const authn = t.middleware(async (opts) => {
  const meta = opts.meta;
  const isActorMeta = isOfKind(meta, "actor");
  if (!isActorMeta || meta.actor === "public")
    throw new TRPCError(
      isActorMeta
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

export const authz = user.unstable_pipe(async (opts) => {
  const meta = opts.meta;
  if (!isOfKind(meta, "access-control"))
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing access control metadata.",
    });

  await AccessControl.enforce([meta.resource, meta.action], {
    Error: TRPCError,
    args: [
      {
        code: "FORBIDDEN",
        message: `Access denied for action "${meta.action}" on resource "${meta.resource}".`,
      },
    ],
  });

  return opts.next(opts);
});
