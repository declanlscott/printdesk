import { vValidator } from "@hono/valibot-validator";
import { Documents } from "@printworks/core/files/documents";
import { Api } from "@printworks/core/tenants/api";
import { Credentials, S3 } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import { Resource } from "sst";
import * as v from "valibot";

import { authz } from "~/api/middleware/auth";
import { executeApiSigner, s3Client, ssmClient } from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";
import { authzValidator } from "~/api/middleware/validators";

export default new Hono()
  .put(
    "/mime-types",
    user,
    authz("documents-mime-types", "update"),
    authzValidator,
    vValidator("json", v.object({ mimeTypes: v.array(v.string()) })),
    executeApiSigner,
    ssmClient({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.putParameters.name,
      ),
      RoleSessionName: "ApiSetDocumentsMimeTypes",
    }),
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
    authzValidator,
    vValidator("query", v.object({})), // TODO
    executeApiSigner,
    s3Client({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.bucketsAccess.name,
      ),
      RoleSessionName: "ApiGetDocumentsSignedGetUrl",
    }),
    async (c) => {
      const signedUrl = await S3.getSignedGetUrl({
        Bucket: await Documents.getBucketName(),
        Key: "TODO",
      });

      return c.json({ signedUrl }, 200);
    },
  )
  .get(
    "/signed-put-url",
    authzValidator,
    vValidator("query", v.object({})), // TODO
    executeApiSigner,
    s3Client({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.bucketsAccess.name,
      ),
      RoleSessionName: "ApiGetDocumentsSignedPutUrl",
    }),
    async (c) => {
      const signedUrl = await S3.getSignedPutUrl({
        Bucket: await Documents.getBucketName(),
        Key: "TODO",
      });

      return c.json({ signedUrl }, 200);
    },
  )
  .put(
    "/size-limit",
    user,
    authz("documents-size-limit", "update"),
    authzValidator,
    vValidator("json", v.object({ byteSize: v.number() })),
    executeApiSigner,
    ssmClient({
      RoleArn: Credentials.buildRoleArn(
        await Api.getAccountId(),
        Resource.Aws.tenant.roles.putParameters.name,
      ),
      RoleSessionName: "ApiSetDocumentsSizeLimit",
    }),
    async (c) => {
      await Documents.setSizeLimit(c.req.valid("json").byteSize);

      return c.body(null, 204);
    },
  )
  .get("/size-limit", executeApiSigner, async (c) => {
    const byteSize = await Documents.getSizeLimit();

    return c.json({ byteSize }, 200);
  });
