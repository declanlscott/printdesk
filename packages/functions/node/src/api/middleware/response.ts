import { pipeline } from "node:stream";
import { promisify } from "node:util";

import { useTenant } from "@printworks/core/tenants/context";
import { S3, withAws } from "@printworks/core/utils/aws";
import { every } from "hono/combine";
import { compress } from "hono/compress";
import { createMiddleware } from "hono/factory";
import { Resource } from "sst";

import type { StartsWith } from "@printworks/core/utils/types";

export const handleLargeResponse = <TKey extends string>(
  key: StartsWith<"/", TKey>,
  maxSize = 5 * 1024 * 1024,
) =>
  createMiddleware(
    every(
      createMiddleware(async (c, next) => {
        await next();

        if (!c.res.body || c.res.headers.get("Content-Encoding") !== "gzip")
          return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chunks: Array<any> = [];
        await promisify(pipeline)(c.res.body, async (source) => {
          for await (const chunk of source) chunks.push(chunk);
        });
        const buffer = Buffer.concat(chunks);

        if (buffer.length > maxSize)
          return withAws({ s3: { client: new S3.Client() } }, async () => {
            const objectKey = `daily/${useTenant().id}${key}.json.gz`;

            await S3.putObject({
              Bucket: Resource.TemporaryBucket.name,
              Key: objectKey,
              ContentEncoding: "gzip",
              ContentType: "application/json",
              Body: buffer,
            });

            const url = await S3.getSignedGetUrl({
              Bucket: Resource.TemporaryBucket.name,
              Key: objectKey,
            });

            return c.redirect(url);
          });
      }),
      compress({ encoding: "gzip" }),
    ),
  );
