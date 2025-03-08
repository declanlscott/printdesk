import { withActor } from "@printworks/core/actors/context";
import { Backend } from "@printworks/core/backend";
import { Sync } from "@printworks/core/papercut/sync";
import { Realtime } from "@printworks/core/realtime";
import { Tenants } from "@printworks/core/tenants";
import { Credentials, SignatureV4, withAws } from "@printworks/core/utils/aws";
import { Constants } from "@printworks/core/utils/constants";
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

  return withActor(
    { type: Constants.ACTOR_TYPES.SYSTEM, properties: { tenantId } },
    async () => {
      const tenant = await Tenants.read().then(R.first());
      if (!tenant) throw new Error("Tenant not found");
      if (tenant.status !== "active") throw new Error("Tenant not active");

      return withAws(
        {
          sigv4: {
            signers: {
              appsync: SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "appsync",
                credentials: Credentials.fromRoleChain([
                  {
                    RoleArn: Credentials.buildRoleArn(
                      Resource.Aws.account.id,
                      Resource.Aws.tenant.roles.realtimePublisher.nameTemplate,
                      tenantId,
                    ),
                    RoleSessionName: "PapercutSync",
                  },
                ]),
              }),
              "execute-api": SignatureV4.buildSigner({
                region: Resource.Aws.region,
                service: "execute-api",
                credentials: Credentials.fromRoleChain([
                  {
                    RoleArn: Credentials.buildRoleArn(
                      Resource.Aws.account.id,
                      Resource.Aws.tenant.roles.apiAccess.nameTemplate,
                      tenantId,
                    ),
                    RoleSessionName: "PapercutSync",
                  },
                ]),
              }),
            },
          },
        },
        async () => {
          let error = undefined;
          try {
            await withXml(Sync.all);
          } catch (e) {
            console.error(e);
            error = e;
          }

          if (event.source === Backend.getReverseDns())
            await Realtime.publish(
              (await Realtime.getDns()).http,
              `/events/${event.id}`,
              [
                JSON.stringify({
                  type: "papercut-sync",
                  success: !!error,
                  dispatchId: event.id,
                }),
              ],
            );

          if (error) throw error;
        },
      );
    },
  );
};
