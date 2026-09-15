import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";
import * as SqlError from "effect/unstable/sql/SqlError";
import { Pool } from "pg";

import { AwsCredentialIdentityProvider } from "../../aws/credential-identity";
import { DsqlSigner } from "../../aws/dsql-signer";
import { layer as dsqlSignerLayer } from "../../aws/dsql-signer/layer";
import { SstResource } from "../../sst/resource";
import * as PgClient from "./client";

const passwordRuntime = dsqlSignerLayer({ expiresIn: Duration.minutes(15) }).pipe(
  Layer.provide(AwsCredentialIdentityProvider.layerFromProvider(fromNodeProviderChain)),
  Layer.provide(SstResource.layer),
  ManagedRuntime.make,
);

export const makeService = Effect.gen(function* () {
  const dsql = yield* SstResource.useSync((resource) => resource.Dsql.pipe(Redacted.value));

  const client = yield* PgClient.fromPool({
    acquire: Effect.gen(function* () {
      const pool = new Pool({
        database: dsql.database,
        host: dsql.host,
        port: dsql.port,
        ssl: dsql.ssl,
        user: dsql.user,
        password: async () =>
          DsqlSigner.use((signer) => signer.getDbConnectAdminAuthToken()).pipe(
            passwordRuntime.runPromise,
          ),
      });

      yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => pool.query("SELECT 1"),
          catch: (cause) =>
            new SqlError.SqlError({
              reason: PgClient.classifyError(cause, "PgClient: Failed to connect", "connect"),
            }),
        }),
        () => Effect.promise(() => pool.end()).pipe(Effect.timeoutOption(Duration.seconds(1))),
        { interruptible: true },
      ).pipe(
        Effect.timeoutOrElse({
          duration: Duration.seconds(5),
          orElse: () =>
            Effect.fail(
              new SqlError.SqlError({
                reason: new SqlError.ConnectionError({
                  cause: new Error("Connection timed out"),
                  message: "PgClient: Connection timed out",
                  operation: "connect",
                }),
              }),
            ),
        }),
      );

      return pool;
    }),
  });

  return client;
});

export const layer = makeService.pipe(PgClient.layerFrom);
