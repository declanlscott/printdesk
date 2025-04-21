import { withUser } from "@printdesk/core/users/context";

import { t } from "~/api/trpc";

export const user = t.middleware(async (opts) =>
  withUser(() => opts.next(opts)),
);
