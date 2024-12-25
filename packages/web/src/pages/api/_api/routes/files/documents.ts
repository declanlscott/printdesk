import { vValidator } from "@hono/valibot-validator";
import { Documents } from "@printworks/core/files/documents";
import { S3 } from "@printworks/core/utils/aws";
import { Hono } from "hono";
import * as v from "valibot";

import { authn, authz } from "~/api/middleware/auth";
import { executeApiSigner, s3Client, ssmClient } from "~/api/middleware/aws";

export default new Hono()
  .put(
    "/mime-types",
    authz("documents-mime-types", "update"),
    vValidator("json", v.object({ mimeTypes: v.array(v.string()) })),
    ssmClient("SetDocumentsMimeTypes"),
    async (c) => {
      await Documents.setMimeTypes(c.req.valid("json").mimeTypes);

      return c.body(null, 204);
    },
  )
  .get("/mime-types", authn, executeApiSigner, async (c) => {
    const mimeTypes = await Documents.getMimeTypes();

    return c.json({ mimeTypes }, 200);
  })
  .get(
    "/signed-get-url",
    authn,
    vValidator("query", v.object({})), // TODO
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
    authn,
    vValidator("query", v.object({})), // TODO
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
    authz("documents-size-limit", "update"),
    vValidator("json", v.object({ byteSize: v.number() })),
    ssmClient("SetDocumentsSizeLimit"),
    async (c) => {
      await Documents.setSizeLimit(c.req.valid("json").byteSize);

      return c.body(null, 204);
    },
  )
  .get("/size-limit", authn, executeApiSigner, async (c) => {
    const byteSize = await Documents.getSizeLimit();

    return c.json({ byteSize }, 200);
  });
