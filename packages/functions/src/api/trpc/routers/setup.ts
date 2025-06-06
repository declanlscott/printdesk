import { Credentials } from "@printdesk/core/aws";
import { Papercut } from "@printdesk/core/papercut";
import { Tenants } from "@printdesk/core/tenants";
import {
  configureDataSchema,
  initializeDataSchema,
  registerDataSchema,
} from "@printdesk/core/tenants/shared";
import { Constants } from "@printdesk/core/utils/constants";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import {
  executeApiSigner,
  sqsClient,
  ssmClient,
} from "~/api/trpc/middleware/aws";
import { systemProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const setupRouter = t.router({
  public: t.router({
    initialize: publicProcedure
      .input(initializeDataSchema)
      .mutation(async ({ input }) =>
        Tenants.initialize(input.licenseKey, {
          papercutSyncCronExpression:
            Constants.DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION,
          timezone: input.timezone,
        }),
      ),
  }),
  register: systemProcedure
    .input(registerDataSchema)
    .mutation(async ({ input }) => {
      await Tenants.register(input);
    }),
  dispatchInfra: systemProcedure.use(sqsClient()).mutation(async () => ({
    dispatchId: await Tenants.dispatchInfra(),
  })),
  configure: systemProcedure
    .input(configureDataSchema)
    .use(
      ssmClient(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.TenantRoles.putParameters.nameTemplate,
          ),
          RoleSessionName: "ApiSetupConfigure",
        },
      ]),
    )
    .mutation(async ({ input }) => {
      await Tenants.config(input);
    }),
  testPapercutConnection: systemProcedure
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.TenantRoles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiSetupTestPapercutConnection",
        },
      ]),
    )
    .query(async () => Papercut.testConnection()),
});

export type SetupRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof setupRouter
>;
