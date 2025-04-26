import { Credentials } from "@printdesk/core/aws";
import { Api } from "@printdesk/core/backend/api";
import { Papercut } from "@printdesk/core/papercut";
import {
  updateServerAuthTokenSchema,
  updateServerTailnetUriSchema,
} from "@printdesk/core/papercut/shared";
import { Tenants } from "@printdesk/core/tenants";
import { TRPCError } from "@trpc/server";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { executeApiSigner, ssmClient } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const papercutRouter = t.router({
  setServerTailnetUri: userProcedure
    .use(authz("services", "update"))
    .input(updateServerTailnetUriSchema)
    .use(
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiSetTailnetPapercutServerUri",
        },
      ]),
    )
    .mutation(async ({ input }) => {
      await Papercut.setTailnetServerUri(input.tailnetUri);
    }),
  setServerAuthToken: userProcedure
    .use(authz("services", "update"))
    .input(updateServerAuthTokenSchema)
    .use(
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiSetPapercutServerAuthToken",
        },
      ]),
    )
    .mutation(async ({ input }) => {
      await Papercut.setServerAuthToken(input.authToken);
    }),
  dispatchSync: userProcedure
    .use(authz("papercut-sync", "create"))
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiDispatchPapercutSync",
        },
      ]),
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

export type PapercutRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof papercutRouter
>;
