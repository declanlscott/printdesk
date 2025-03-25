import { withUser } from "@printworks/core/users/context";

import { t } from "~/api/trpc";

export const user = t.middleware(async ({ next }) => withUser(next));
