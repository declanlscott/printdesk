import { vValidator } from "@hono/valibot-validator";
import { Documents } from "@printworks/core/backend/documents";
import { useTenant } from "@printworks/core/tenants/context";
import { Credentials, S3 } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { authz } from "~/api/middleware/auth";
import { executeApiSigner, s3Client, ssmClient } from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";
import { authzHeadersValidator } from "~/api/middleware/validators";

export default new Hono()
  .put(
    "/mime-types",
    user,
    authz("documents-mime-types", "update"),
    authzHeadersValidator,
    vValidator("json", v.object({ mimeTypes: v.array(v.string()) })),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetDocumentsMimeTypes",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetDocumentsMimeTypes",
    })),
    async (c) => {
      await Documents.setMimeTypes(c.req.valid("json").mimeTypes);

      return c.body(null, 204);
    },
  )
  .get("/mime-types", async (c) => {
    const mimeTypes = await Documents.getMimeTypes();

    return c.json({ mimeTypes }, 200);
  })
  .get(
    "/signed-get-url",
    authzHeadersValidator,
    vValidator("query", v.object({})), // TODO
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetDocumentsSignedGetUrl",
    })),
    s3Client(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetDocumentsSignedGetUrl",
    })),
    async (c) => {
      const signedUrl = await S3.getSignedGetUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      });

      return c.json({ signedUrl }, 200);
    },
  )
  .get(
    "/signed-put-url",
    authzHeadersValidator,
    vValidator("query", v.object({})), // TODO
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetDocumentsSignedPutUrl",
    })),
    s3Client(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.bucketsAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetDocumentsSignedPutUrl",
    })),
    async (c) => {
      const signedUrl = await S3.getSignedPutUrl({
        Bucket: await Documents.getBucket(),
        Key: "TODO",
      });

      return c.json({ signedUrl }, 200);
    },
  )
  .put(
    "/size-limit",
    user,
    authz("documents-size-limit", "update"),
    authzHeadersValidator,
    vValidator("json", v.object({ byteSize: v.number() })),
    ssmClient(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.putParameters.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetDocumentsSizeLimit",
    })),
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiSetDocumentsSizeLimit",
    })),
    async (c) => {
      await Documents.setSizeLimit(c.req.valid("json").byteSize);

      return c.body(null, 204);
    },
  )
  .get(
    "/size-limit",
    executeApiSigner(() => ({
      RoleArn: Credentials.buildRoleArn(
        Resource.Aws.account.id,
        Resource.Aws.tenant.roles.apiAccess.nameTemplate,
        useTenant().id,
      ),
      RoleSessionName: "ApiGetDocumentsSizeLimit",
    })),
    async (c) => {
      const byteSize = await Documents.getSizeLimit();

      return c.json({ byteSize }, 200);
    },
  );
