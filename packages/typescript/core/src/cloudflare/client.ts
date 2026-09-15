import _CloudflareClient from "cloudflare";
import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
import * as Struct from "effect/Struct";

import { Cloudflare } from ".";
import { AwsCredentialIdentityProvider } from "../aws/credential-identity";
import { S3Credentials } from "../aws/s3/credentials";
import { Crypto } from "../crypto";
import { CloudflareContract } from "./contract";

export class CloudflareClientError extends Schema.TaggedError<CloudflareClientError>()(
  "CloudflareClientError",
  { cause: Schema.Defect() },
) {}

export interface CloudflareR2TemporaryCredentialsOptions {
  bucket: string;
  endpoint: string;
  scope: "admin-read-only" | "admin-read-write" | "object-read-only" | "object-read-write";
  actions?: Array.NonEmptyArray<string>;
  ttl?: Duration.Duration;
  paths?: {
    prefix?: Array.NonEmptyArray<string>;
    object?: Array.NonEmptyArray<string>;
  };
}

export class CloudflareClient extends Context.Service<CloudflareClient>()(
  "@printdesk/core/cloudflare/Client",
  {
    make: Effect.gen(function* () {
      const { account, apiToken } = yield* Cloudflare;
      const crypto = yield* Crypto;
      const r2S3Credentials = yield* S3Credentials;

      const textEncoder = new TextEncoder();

      const client = yield* Effect.try({
        try: () => new _CloudflareClient({ apiToken: apiToken.pipe(Redacted.value) }),
        catch: (cause) => new CloudflareClientError({ cause }),
      });

      const getTunnelToken = Effect.fn("CloudflareClient.getTunnelToken")(
        (tunnelId: CloudflareContract.TunnelId) =>
          Effect.tryPromise({
            try: (signal) =>
              client.zeroTrust.tunnels.cloudflared.token.get(
                tunnelId,
                { account_id: account.id },
                { signal },
              ),
            catch: (cause) => new CloudflareClientError({ cause }),
          }).pipe(Effect.flatMap(Schema.decodeEffect(CloudflareContract.TunnelToken))),
      );

      const refreshTunnelToken = Effect.fn("CloudflareClient.refreshTunnelToken")(
        (tunnelId: CloudflareContract.TunnelId) =>
          crypto.generateToken().pipe(
            Effect.map(Redacted.value),
            Effect.flatMap((tunnel_secret) =>
              Effect.tryPromise({
                try: (signal) =>
                  client.zeroTrust.tunnels.cloudflared.edit(
                    tunnelId,
                    { account_id: account.id, tunnel_secret },
                    { signal },
                  ),
                catch: (cause) => new CloudflareClientError({ cause }),
              }),
            ),
            Effect.andThen(getTunnelToken(tunnelId)),
          ),
      );

      const createR2TemporaryCredentials = Effect.fn(
        "CloudflareClient.createR2TemporaryCredentials",
      )(function* (opts: CloudflareR2TemporaryCredentialsOptions) {
        const claims: Record<string, unknown> = {
          bucket: opts.bucket,
          scope: opts.scope,
        };

        if (opts.actions) claims.actions = opts.actions;
        if (opts.paths)
          claims.paths = {
            prefixPaths: opts.paths.prefix ?? [],
            objectPaths: opts.paths.object ?? [],
          };

        const jwt = yield* crypto.signJwt({
          claims,
          subject: account.id,
          issuer: r2S3Credentials.accessKeyId.pipe(Redacted.value),
          audience: opts.endpoint,
          ttl: opts.ttl,
          key: textEncoder.encode(r2S3Credentials.secretAccessKey.pipe(Redacted.value)),
        });

        const secretAccessKey = yield* crypto
          .digest("SHA-256", textEncoder.encode(jwt))
          .pipe(Effect.flatMap(Schema.encodeEffect(Schema.Uint8ArrayFromHex)));

        const sessionToken = yield* Effect.succeed("jwt/").pipe(
          Effect.map(String.concat(jwt)),
          Effect.flatMap(Schema.encodeEffect(Schema.StringFromBase64)),
        );

        return yield* AwsCredentialIdentityProvider.make({
          accessKeyId: r2S3Credentials.accessKeyId.pipe(Redacted.value),
          secretAccessKey,
          sessionToken,
        }).pipe(Effect.map(Struct.get("credentials")));
      });

      return {
        getTunnelToken,
        refreshTunnelToken,
        createR2TemporaryCredentials,
      } as const;
    }),
  },
) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
