import { Credentials } from "@printworks/core/aws";
import { Tailscale } from "@printworks/core/tailscale";
import { tailscaleOauthClientSchema } from "@printworks/core/tailscale/shared";
import { useTenant } from "@printworks/core/tenants/context";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { ssmClient } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";

export const tailscaleRouter = t.router({
  setOauthClient: userProcedure
    .meta({ kind: "access-control", resource: "services", action: "update" })
    .use(authz)
    .input(tailscaleOauthClientSchema)
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetTailscaleOauthClient",
      }),
    })
    .use(ssmClient)
    .mutation(async ({ input }) => {
      await Tailscale.setOauthClient(input.id, input.secret);
    }),
});
