import { Credentials } from "@printdesk/core/aws";
import { Realtime } from "@printdesk/core/realtime";
import { useTenant } from "@printdesk/core/tenants/context";
import { Resource } from "sst";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { appsyncSigner, executeApiSigner } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const realtimeRouter = t.router({
  getPublicUrl: publicProcedure.query(() => Realtime.getUrl()),
  getPublicAuth: publicProcedure
    .input(
      v.object({ channel: v.optional(v.pipe(v.string(), v.startsWith("/"))) }),
    )
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Resource.Aws.roles.realtimeSubscriber.arn,
        RoleSessionName: "PublicRealtimeSubscriber",
      }),
    })
    .use(appsyncSigner)
    .query(async ({ input }) => Realtime.getAuth(JSON.stringify(input))),
  getUrl: userProcedure
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.apiAccess.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "ApiGetRealtimeUrl",
      }),
    })
    .use(executeApiSigner)
    .query(async () => Realtime.getUrl((await Realtime.getDns()).realtime)),
  getAuth: userProcedure
    .input(
      v.object({
        channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
      }),
    )
    .meta({
      kind: "aws-assume-role",
      getInput: () => ({
        RoleArn: Credentials.buildRoleArn(
          Resource.Aws.account.id,
          Resource.Aws.tenant.roles.realtimeSubscriber.nameTemplate,
          useTenant().id,
        ),
        RoleSessionName: "TenantRealtimeSubscriber",
      }),
    })
    .use(appsyncSigner)
    .query(async ({ input }) =>
      Realtime.getAuth((JSON.stringify(input), await Realtime.getDns()).http),
    ),
});

export type RealtimeRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof realtimeRouter
>;
