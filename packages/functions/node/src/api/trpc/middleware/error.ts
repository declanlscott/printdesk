import { ServerErrors } from "@printworks/core/errors";
import { SharedErrors } from "@printworks/core/errors/shared";
import { TRPCError } from "@trpc/server";

import { t } from "~/api/trpc";

export const errorHandler = t.middleware(async (opts) => {
  const result = await opts.next(opts);

  if (!result.ok)
    throw new TRPCError({
      code: (() => {
        if (result.error.cause instanceof ServerErrors.BadRequest)
          return "BAD_REQUEST";
        if (result.error.cause instanceof SharedErrors.Unauthenticated)
          return "UNAUTHORIZED";
        if (
          result.error.cause instanceof SharedErrors.AccessDenied ||
          result.error.cause instanceof ServerErrors.InvalidActor
        )
          return "FORBIDDEN";
        if (result.error.cause instanceof SharedErrors.NotFound)
          return "NOT_FOUND";
        if (result.error.cause instanceof ServerErrors.MutationConflict)
          return "CONFLICT";
        return "INTERNAL_SERVER_ERROR";
      })(),
      message: result.error.cause?.message ?? "An unexpected error occurred.",
    });

  return result;
});
