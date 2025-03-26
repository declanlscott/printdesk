import { Papercut } from "@printworks/core/papercut";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import {
  configureDataSchema,
  initializeDataSchema,
  registerDataSchema,
} from "@printworks/core/tenants/shared";
import { Credentials } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import {
  executeApiSigner,
  sqsClient,
  ssmClient,
} from "~/api/trpc/middleware/aws";
import { systemProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

export const setupRouter = t.router({
  initialize: publicProcedure
    .input(initializeDataSchema)
    .mutation(async ({ input }) =>
      Tenants.initialize(input.licenseKey, {
        papercutSyncCronExpression:
          Constants.DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION,
        timezone: input.timezone,
      }),
    ),
  register: systemProcedure
    .input(registerDataSchema)
    .mutation(async ({ input }) => {
      await Tenants.register(input);
    }),
  dispatchInfra: systemProcedure.use(sqsClient).mutation(async () => ({
    dispatchId: await Tenants.dispatchInfra(),
  })),
  configure: systemProcedure
    .input(configureDataSchema)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetupConfigure",
      }),
    })
    .use(ssmClient)
    .mutation(async ({ input }) => {
      await Tenants.config(input);
    }),
  testPapercutConnection: systemProcedure
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetupTestPapercutConnection",
      }),
    })
    .use(executeApiSigner)
    .mutation(async () => {
      await Papercut.testConnection();
    }),
});
