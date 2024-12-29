import { vValidator } from "@hono/valibot-validator";
import { Documents } from "@printworks/core/files/documents";
import { S3 } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import * as v from "valibot";

import { authn, authz, authzHeader } from "~/api/middleware/auth";
import {
  executeApiSigner,
  s3Client,
  ssmClient,
  stsClient,
} from "~/api/middleware/aws";
import { user } from "~/api/middleware/user";

export default new Hono()
  .put(
    "/mime-types",
    authzHeader,
    user,
    authz("documents-mime-types", "update"),
    vValidator("json", v.object({ mimeTypes: v.array(v.string()) })),
    executeApiSigner,
    stsClient,
    ssmClient("SetDocumentsMimeTypes"),
    async (c) => {
      await Documents.setMimeTypes(c.req.valid("json").mimeTypes);

      return c.body(null, 204);
    },
  )
  .get("/mime-types", authn, async (c) => {
    const mimeTypes = await Documents.getMimeTypes();

    return c.json({ mimeTypes }, 200);
  })
  .get(
    "/signed-get-url",
    authzHeader,
    vValidator("query", v.object({})), // TODO
    executeApiSigner,
    stsClient,
    s3Client("GetDocumentsSignedGetUrl"),
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
    authzHeader,
    vValidator("query", v.object({})), // TODO
    executeApiSigner,
    stsClient,
    s3Client("GetDocumentsSignedPutUrl"),
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
    authzHeader,
    user,
    authz("documents-size-limit", "update"),
    vValidator("json", v.object({ byteSize: v.number() })),
    executeApiSigner,
    stsClient,
    ssmClient("SetDocumentsSizeLimit"),
    async (c) => {
      await Documents.setSizeLimit(c.req.valid("json").byteSize);

      return c.body(null, 204);
    },
  )
  .get("/size-limit", authzHeader, executeApiSigner, async (c) => {
    const byteSize = await Documents.getSizeLimit();

    return c.json({ byteSize }, 200);
  });
