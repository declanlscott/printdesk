import { t } from "~/api/trpc";
import { authn } from "~/api/trpc/middleware/auth";

export const userProcedure = t.procedure.use(authn("user"));

export const systemProcedure = t.procedure.use(authn("system"));
