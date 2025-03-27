import { authn } from "~/api/trpc/middleware/auth";
import { procedure } from "~/api/trpc/procedures";

export const userProcedure = procedure
  .meta({ kind: "actor", actor: "user" })
  .use(authn);

export const systemProcedure = procedure
  .meta({ kind: "actor", actor: "system" })
  .use(authn);
