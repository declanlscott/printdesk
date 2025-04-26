import { procedure } from "~/api/trpc/procedures";

export const publicProcedure = procedure.meta({ actor: "public" });
