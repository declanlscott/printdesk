import { withUser } from "@printworks/core/users/context";
import { createMiddleware } from "hono/factory";

/**
 * NOTE: Depends on actor middleware
 */
export const user = createMiddleware(async (_, next) => withUser(next));
