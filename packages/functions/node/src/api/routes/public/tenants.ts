import { vValidator } from "@hono/valibot-validator";
import { withActor } from "@printworks/core/actors/context";
import { oauth2ProvidersTable } from "@printworks/core/auth/sql";
import { Api } from "@printworks/core/backend/api";
import { Documents } from "@printworks/core/backend/documents";
import { useTransaction } from "@printworks/core/drizzle/context";
import { Papercut } from "@printworks/core/papercut";
import { Tailscale } from "@printworks/core/tailscale";
import { Tenants } from "@printworks/core/tenants";
import { useTenant } from "@printworks/core/tenants/context";
import {
  registrationSchema,
  tenantSlugSchema,
} from "@printworks/core/tenants/shared";
import {
  tenantMetadataTable,
  tenantsTable,
} from "@printworks/core/tenants/sql";
import { Utils } from "@printworks/core/utils";
import { Credentials } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
import { HttpError } from "@printworks/core/utils/errors";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { and, eq, isNotNull } from "drizzle-orm";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import { executeApiSigner, sqsClient, ssmClient } from "~/api/middleware/aws";

const registrationParams = [
  "tailscaleOauthClientId",
  "tailscaleOauthClientSecret",
  "tailnetPapercutServerUri",
  "papercutServerAuthToken",
] as const;

export default new Hono()
  .post(
    "/register",
    vValidator("json", v.omit(registrationSchema, registrationParams)),
    sqsClient(),
    async (c) => {
      const result = await Tenants.register(c.req.valid("json"));

      return c.json(result, 202);
    },
  )
  .post(
    "/initialize",
    vValidator(
      "header",
      v.object({
        authorization: v.string(),
        "x-tenant-id": nanoIdSchema,
      }),
    ),
    bearerAuth({
      async verifyToken(token, c) {
        const tenantId = c.req.header("X-Tenant-Id")!;

        const result = await useTransaction(async (tx) =>
          tx
            .select({ apiKey: tenantMetadataTable.apiKey })
            .from(tenantsTable)
            .innerJoin(
              tenantMetadataTable,
              eq(tenantMetadataTable.tenantId, tenantsTable.id),
            )
            .where(
              and(
                eq(tenantsTable.id, tenantId),
                eq(tenantsTable.status, "initializing"),
                isNotNull(tenantMetadataTable.apiKey),
              ),
            )
            .then(R.first()),
        );
        if (!result || !result.apiKey) {
          console.error("Initial tenant not found or missing API key");
          return false;
        }

        return Utils.verifySecret(token, result.apiKey);
      },
    }),
    (c, next) =>
      withActor(
        {
          type: "system",
          properties: { tenantId: c.req.valid("header")["x-tenant-id"] },
        },
        next,
      ),
    vValidator("json", v.pick(registrationSchema, registrationParams)),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiInitializeTenant",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiInitializeTenant",
    })),
    async (c) => {
      await Promise.all([
        Tailscale.setOauthClient(
          c.req.valid("json").tailscaleOauthClientId,
          c.req.valid("json").tailscaleOauthClientSecret,
        ),
        Papercut.setTailnetServerUri(
          c.req.valid("json").tailnetPapercutServerUri,
        ),
        Papercut.setServerAuthToken(
          c.req.valid("json").papercutServerAuthToken,
        ),
        Documents.setMimeTypes(Constants.DEFAULT_DOCUMENTS_MIME_TYPES),
        Documents.setSizeLimit(Constants.DEFAULT_DOCUMENTS_SIZE_LIMIT),
      ]);

      const { eventId: dispatchId } = await Api.papercutSync();

      return c.json({ dispatchId }, 202);
    },
  )
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
