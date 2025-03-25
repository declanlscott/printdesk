import { Api } from "@printworks/core/backend/api";
import { Papercut } from "@printworks/core/papercut";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printworks/core/papercut/shared";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { TRPCError } from "@trpc/server";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { executeApiSigner, ssmClient } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";

export const papercutRouter = t.router({
  setServerTailnetUri: userProcedure
    .use(authz("services", "update"))
    .input(updateServerTailnetUriSchema)
    .use(
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetTailnetPapercutServerUri",
      })),
    )
    .mutation(async ({ input }) => {
      await Papercut.setTailnetServerUri(input.tailnetUri);
    }),
  setServerAuthToken: userProcedure
    .use(authz("services", "update"))
    .input(updateServerAuthTokenSchema)
    .use(
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetPapercutServerAuthToken",
      })),
    )
    .mutation(async ({ input }) => {
      await Papercut.setServerAuthToken(input.authToken);
    }),
  sync: userProcedure
    .use(authz("papercut-sync", "create"))
    .use(
      executeApiSigner(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiPapercutSync",
      })),
    )
    .mutation(async () => Api.dispatchPapercutSync()),
  getLastSync: userProcedure
    .use(authz("papercut-sync", "read"))
    .query(async () => {
      const metadata = await Tenants.readMetadata();
      if (!metadata)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant metadata not found",
        });

      const at = metadata.lastPapercutSyncAt?.toISOString();
      if (!at)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Last sync not found",
        });

      return { at };
    }),
});
