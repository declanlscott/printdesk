import { pipeline } from "node:stream";
import { promisify } from "node:util";

import { vValidator } from "@hono/valibot-validator";
import { Credentials, S3, SignatureV4 } from "@printdesk/core/aws";
import { withAws } from "@printdesk/core/aws/context";
import { Replicache } from "@printdesk/core/replicache";
import {
  pullRequestSchema,
  pushRequestSchema,
} from "@printdesk/core/replicache/shared";
import { useTenant } from "@printdesk/core/tenants/context";
import { withUser } from "@printdesk/core/users/context";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { Resource } from "sst";

export default new Hono()
  .use(async (_, next) => withUser(next))
  .post(
    "/pull",
    vValidator("json", pullRequestSchema),
    async (c, next) => {
      await next();

      if (!c.res.body || c.res.headers.get("Content-Encoding") !== "gzip")
        return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunks: Array<any> = [];
      await promisify(pipeline)(c.res.body, async (source) => {
        for await (const chunk of source) chunks.push(chunk);
      });
      const buffer = Buffer.concat(chunks);

      if (buffer.length > 5 * 1024 * 1024)
        return withAws(
          () => ({ s3: { client: new S3.Client() } }),
          async () => {
            const objectKey = `daily/${useTenant().id}/replicache/pull/${c.req.valid("json").profileID}.json.gz`;

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
          },
        );
    },
    compress({ encoding: "gzip" }),
    async (c) => {
      const pullResponse = await Replicache.pull(c.req.valid("json"));

      return c.json(pullResponse, 200);
    },
  )
  .post(
    "/push",
    vValidator("json", pushRequestSchema),
    async (_, next) =>
      withAws(
        () => ({
          sigv4: {
            signers: {
              appsync: SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "appsync",
                credentials: Credentials.fromRoleChain({
                  RoleArn: Credentials.buildRoleArn(
                    Resource.Aws.tenant.roles.realtimePublisher.nameTemplate,
                  ),
                  RoleSessionName: "ApiReplicachePush",
                }),
              }),
              "execute-api": SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "execute-api",
                credentials: Credentials.fromRoleChain({
                  RoleArn: Credentials.buildRoleArn(
                    Resource.Aws.tenant.roles.apiAccess.nameTemplate,
                  ),
                  RoleSessionName: "ApiReplicachePush",
                }),
              }),
            },
          },
        }),
        next,
      ),
    async (c) => {
      const pushResponse = await Replicache.push(c.req.valid("json"));

      return c.json(pushResponse, 200);
    },
  );
