import { vValidator } from "@hono/valibot-validator";
import { Auth } from "@printworks/core/auth";
import { Tenants } from "@printworks/core/tenants";
import { tenantSlugSchema } from "@printworks/core/tenants/shared";
import { HttpError } from "@printworks/core/utils/errors";
import { Hono } from "hono";
import * as R from "remeda";
import * as v from "valibot";

export default new Hono()
  .get(
    "/slug-availability/:value",
    vValidator("param", v.object({ value: tenantSlugSchema })),
    async (c) => {
      const isAvailable = await Tenants.isSlugAvailable(
        c.req.valid("param").value,
      );

      return c.json({ isAvailable }, 200);
    },
  )
  .get(
    "/license-key-availability/:value",
    vValidator(
      "param",
      v.object({ value: v.pipe(v.string(), v.trim(), v.uuid()) }),
    ),
    async (c) => {
      const isAvailable = await Tenants.isLicenseKeyAvailable(
        c.req.valid("param").value,
      );

      return c.json({ isAvailable }, 200);
    },
  )
  .get(
    "/oauth-providers",
    vValidator("query", v.object({ slug: tenantSlugSchema })),
    async (c) => {
      const providers = await Auth.readOauth2ProvidersBySlug(
        c.req.valid("query").slug,
      ).then(R.map(R.prop("type")));
      if (R.isEmpty(providers))
        throw new HttpError.NotFound("Tenant not found");

      return c.json({ providers }, 200);
    },
  );
