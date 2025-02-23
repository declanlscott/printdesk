import { AccessControl } from "@printworks/core/access-control";
import { assertActor } from "@printworks/core/actors/context";
import { HttpError } from "@printworks/core/utils/errors";
import { createMiddleware } from "hono/factory";

import type { Action, Resource } from "@printworks/core/access-control/shared";
import type { PrivateActor } from "@printworks/core/actors/context";

/**
 * NOTE: Depends on actor middleware
 */
export const authn = <TActorType extends PrivateActor["type"]>(
  actorType: TActorType,
) =>
  createMiddleware((_, next) => {
    try {
      assertActor(actorType);
    } catch {
      throw new HttpError.Unauthorized();
    }

    return next();
  });

/**
 * NOTE: Depends on user middleware
 */
export const authz = (resource: Resource, action: Action) =>
  createMiddleware(async (_, next) => {
    await AccessControl.enforce([resource, action], {
      Error: HttpError.Forbidden,
      args: [],
    });

    return next();
  });
