import { Tailscale } from "@printworks/core/tailscale";
import { tailscaleOauthClientSchema } from "@printworks/core/tailscale/shared";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { Resource } from "sst";

import { t } from "~/api/trpc";
import { authz } from "~/api/trpc/middleware/auth";
import { ssmClient } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";

export const tailscaleRouter = t.router({
  setOauthClient: userProcedure
    .use(authz("services", "update"))
    .input(tailscaleOauthClientSchema)
    .use(
      ssmClient(() => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.putParameters.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiSetTailscaleOauthClient",
      })),
    )
    .mutation(async ({ input }) => {
      await Tailscale.setOauthClient(input.id, input.secret);
    }),
});
