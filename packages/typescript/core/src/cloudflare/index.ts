import CloudflareClient from "cloudflare";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { SstResource } from "../sst/resource";
import { CloudflareContract } from "./contract";

export class CloudflareError extends Schema.TaggedErrorClass<CloudflareError>()("CloudflareError", {
  cause: Schema.Defect(),
}) {}

export class Cloudflare extends Context.Service<Cloudflare>()(
  "@printdesk/core/cloudflare/Cloudflare",
  {
    make: Effect.gen(function* () {
      const { account, apiToken } = yield* SstResource.useSync((resource) =>
        resource.Cloudflare.pipe(Redacted.value),
      );

      const client = yield* Effect.try({
        try: () => new CloudflareClient({ apiToken }),
        catch: (cause) => new CloudflareError({ cause }),
      });

      const getTunnelToken = Effect.fn("Cloudflare.getTunnelToken")(
        (tunnelId: CloudflareContract.TunnelId) =>
          Effect.tryPromise({
            try: (signal) =>
              client.zeroTrust.tunnels.cloudflared.token.get(
                tunnelId,
                { account_id: account.id },
                { signal },
              ),
            catch: (cause) => new CloudflareError({ cause }),
          }).pipe(Effect.flatMap(Schema.decodeEffect(CloudflareContract.TunnelToken))),
      );

      return { getTunnelToken } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
