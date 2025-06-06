import { Credentials } from "@printdesk/core/aws";
import { Realtime } from "@printdesk/core/realtime";
import { Resource } from "sst";
import * as v from "valibot";

import { t } from "~/api/trpc";
import { appsyncSigner, executeApiSigner } from "~/api/trpc/middleware/aws";
import { userProcedure } from "~/api/trpc/procedures/protected";
import { publicProcedure } from "~/api/trpc/procedures/public";

import type { InferRouterIO, IO } from "~/api/trpc/types";

export const realtimeRouter = t.router({
  public: t.router({
    getAuthorization: publicProcedure
      .input(
        v.object({
          channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
        }),
      )
      .use(
        appsyncSigner(() => [
          {
            RoleArn: Resource.RealtimeSubscriberRole.arn,
            RoleSessionName: "PublicRealtimeSubscriber",
            ExternalId: Resource.RealtimeSubscriberRoleExternalId.value,
          },
        ]),
      )
      .query(async ({ input }) =>
        Realtime.getAuth(3600, JSON.stringify(input)),
      ),
  }),
  getUrl: userProcedure
    .use(
      executeApiSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.TenantRoles.apiAccess.nameTemplate,
          ),
          RoleSessionName: "ApiGetRealtimeUrl",
        },
      ]),
    )
    .query(async () => Realtime.getUrl((await Realtime.getDns()).realtime)),
  getAuthorization: userProcedure
    .input(
      v.object({
        channel: v.optional(v.pipe(v.string(), v.startsWith("/"))),
      }),
    )
    .use(
      appsyncSigner(() => [
        {
          RoleArn: Credentials.buildRoleArn(
            Resource.TenantRoles.realtimeSubscriber.nameTemplate,
          ),
          RoleSessionName: "TenantRealtimeSubscriber",
        },
      ]),
    )
    .query(async ({ input }) =>
      Realtime.getAuth(
        undefined,
        JSON.stringify(input),
        (await Realtime.getDns()).http,
      ),
    ),
});

export type RealtimeRouterIO<TIO extends IO> = InferRouterIO<
  TIO,
  typeof realtimeRouter
>;
