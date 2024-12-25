import { vValidator } from "@hono/valibot-validator";
import { Tailscale } from "@printworks/core/tailscale";
import { Hono } from "hono";
import * as v from "valibot";

import { authz } from "~/api/middleware/auth";
import { ssmClient } from "~/api/middleware/aws";

export default new Hono().put(
  "/oauth-client",
  authz("services", "update"),
  vValidator(
    "json",
    v.object({
      id: v.string(),
      secret: v.string(),
    }),
  ),
  ssmClient("SetTailscaleOauthClient"),
  async (c) => {
    await Tailscale.setOauthClient(
      c.req.valid("json").id,
      c.req.valid("json").secret,
    );

    return c.body(null, 204);
  },
);
