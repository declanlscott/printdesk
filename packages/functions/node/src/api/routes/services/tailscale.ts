import { vValidator } from "@hono/valibot-validator";
import { Tailscale } from "@printworks/core/tailscale";
import { tailscaleOauthClientSchema } from "@printworks/core/tailscale/shared";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";

import { authz } from "~/api/middleware/auth";
import { ssmClient } from "~/api/middleware/aws";
import { authzHeadersValidator } from "~/api/middleware/validators";

export default new Hono().put(
  "/oauth-client",
  authz("services", "update"),
  authzHeadersValidator,
  vValidator("json", tailscaleOauthClientSchema),
  ssmClient(() => ({
    RoleArn: Credentials.buildRoleArn(
      Resource.Aws.account.id,
      Resource.Aws.tenant.roles.putParameters.nameTemplate,
      useTenant().id,
    ),
    RoleSessionName: "ApiSetTailscaleOauthClient",
  })),
  async (c) => {
    await Tailscale.setOauthClient(
      c.req.valid("json").id,
      c.req.valid("json").secret,
    );

    return c.body(null, 204);
  },
);
