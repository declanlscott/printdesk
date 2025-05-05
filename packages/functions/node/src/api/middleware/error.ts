import { ServerErrors } from "@printdesk/core/errors";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { Constants } from "@printdesk/core/utils/constants";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst";

import type {
  ClientStateNotFoundResponse,
  VersionNotSupportedResponse,
} from "replicache";
import type { Bindings } from "~/api/types";

export const errorHandler = createMiddleware<{ Bindings: Bindings }>(
  async (c, next) => {
    try {
      if (
        c.env.event.headers["x-forwarded-host"] !==
          Resource.AppData.domainName.fullyQualified ||
        c.env.event.headers[Constants.HEADER_NAMES.ROUTER_SECRET] !==
          Resource.RouterSecret.value
      )
        throw new SharedErrors.AccessDenied();

      await next();
    } catch (e) {
      console.error(e);

      if (e instanceof ServerErrors.BadRequest) throw new HTTPException(400, e);
      if (e instanceof SharedErrors.Unauthenticated)
        throw new HTTPException(401, e);
      if (
        e instanceof SharedErrors.AccessDenied ||
        e instanceof ServerErrors.InvalidActor
      )
        throw new HTTPException(403, e);
      if (e instanceof SharedErrors.NotFound) throw new HTTPException(404, e);
      if (e instanceof ServerErrors.MutationConflict)
        throw new HTTPException(409, e);
      if (e instanceof ServerErrors.ReplicacheClientStateNotFound)
        throw new HTTPException(200, {
          res: new Response(
            JSON.stringify({
              error: "ClientStateNotFound",
            } satisfies ClientStateNotFoundResponse),
          ),
          ...e,
        });
      if (e instanceof ServerErrors.ReplicacheVersionNotSupported)
        throw new HTTPException(200, {
          res: new Response(
            JSON.stringify({
              error: "VersionNotSupported",
              versionType: e.versionType,
            } satisfies VersionNotSupportedResponse),
          ),
        });

      if (e instanceof globalThis.Error) throw new HTTPException(500, e);

      throw new HTTPException(500);
    }
  },
);
