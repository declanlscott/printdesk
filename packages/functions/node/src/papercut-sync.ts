import { withActor } from "@printworks/core/actors/context";
import { PapercutSync } from "@printworks/core/papercut/sync";
import { Realtime } from "@printworks/core/realtime";
import { Tenants } from "@printworks/core/tenants";
import { Api } from "@printworks/core/tenants/api";
import { Credentials, SignatureV4, withAws } from "@printworks/core/utils/aws";
import { nanoIdSchema } from "@printworks/core/utils/shared";
import { withXml } from "@printworks/core/utils/xml";
import * as R from "remeda";
import { Resource } from "sst";
import * as v from "valibot";

import type { EventBridgeHandler } from "aws-lambda";

export const handler: EventBridgeHandler<string, unknown, void> = async (
  event,
) => {
  const { tenantId } = v.parse(
    v.object({ tenantId: nanoIdSchema }),
    event.detail,
  );

  const channel = `/events/${event.id}` as const;

  return withActor({ type: "system", properties: { tenantId } }, async () => {
    const tenant = await Tenants.read().then(R.first());
    if (!tenant || tenant.status === "suspended")
      throw new Error("Tenant not found or suspended");

    return withAws(
      {
        sigv4: {
          signers: {
            "execute-api": SignatureV4.buildSigner({
              region: Resource.Aws.region,
              service: "execute-api",
            }),
          },
        },
      },
      async () =>
        withAws(
          {
            sigv4: {
              signers: {
                appsync: SignatureV4.buildSigner({
                  region: Resource.Aws.region,
                  service: "appsync",
                  credentials: Credentials.fromRoleChain([
                    {
                      RoleArn: Credentials.buildRoleArn(
                        await Api.getAccountId(),
                        Resource.Aws.tenant.roles.realtimePublisher.name,
                      ),
                      RoleSessionName: "PapercutSyncRealtimePublisher",
                    },
                  ]),
                }),
              },
            },
          },
          async () => {
            const { http: publishDomain } =
              await Api.getAppsyncEventsDomainNames();

            try {
              await withXml(PapercutSync.users);
            } catch (e) {
              console.error(e);

              if (event["detail-type"] !== "Scheduled Event")
                await Realtime.publish(publishDomain, channel, [
                  JSON.stringify({ success: false }),
                ]);

              throw e;
            }

            await Realtime.publish(publishDomain, channel, [
              JSON.stringify({ success: true }),
            ]);
          },
        ),
    );
  });
};
