import { authn } from "~/api/trpc/middleware/auth";
import { procedure } from "~/api/trpc/procedures";

export const userProcedure = procedure.meta({ actor: "user" }).use(authn);

export const systemProcedure = procedure.meta({ actor: "system" }).use(authn);
