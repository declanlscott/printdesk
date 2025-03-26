import { t } from "~/api/trpc";
import { authn } from "~/api/trpc/middleware/auth";

export const userProcedure = t.procedure
  .meta({ kind: "actor", actor: "user" })
  .use(authn);

export const systemProcedure = t.procedure
  .meta({ kind: "actor", actor: "system" })
  .use(authn);
