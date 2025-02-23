import { withUser } from "@printworks/core/users/context";
import { createMiddleware } from "hono/factory";

/**
 * NOTE: Depends on actor middleware with context of type "user"
 */
export const user = createMiddleware(async (_, next) => withUser(next));
