import { Users } from "@printworks/core/users";
import { withUser } from "@printworks/core/users/context";
import { createMiddleware } from "hono/factory";

/**
 * NOTE: Depends on actor middleware with context of kind "user"
 */
export const user = createMiddleware(async (_, next) => withUser(next));

/**
 * NOTE: Depends on actor middleware with context of kind "user"
 */
export const activity = createMiddleware(async (_, next) => {
  await Users.recordActivity();

  return next();
});
