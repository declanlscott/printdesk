import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import * as PgClient from "@effect/sql-pg/PgClient";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";
import * as SqlError from "effect/unstable/sql/SqlError";
import { Pool } from "pg";

import { AwsCredentialIdentity } from "../aws/credential-identity";
import { DsqlSigner } from "../aws/dsql-signer";
import { layer as dsqlSignerLayer } from "../aws/dsql-signer/layer";
import { SstResource } from "../sst/resource";

export const pgCodeFromCause = (cause: unknown): string | undefined => {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) return undefined;

  const code = cause.code;
  return typeof code === "string" ? code : undefined;
};

export const pgConstraintFromCause = (cause: unknown): string => {
  if (typeof cause !== "object" || cause === null || !("constraint" in cause)) return "unknown";

  const constraint = cause.constraint;
  if (typeof constraint !== "string") return "unknown";

  const normalized = constraint.trim();
  return normalized.length === 0 ? "unknown" : normalized;
};

export const classifyError = (cause: unknown, message: string, operation: string) => {
  const props = { cause, message, operation };
  const code = pgCodeFromCause(cause);

  if (code !== undefined) {
    if (code.startsWith("08")) return new SqlError.ConnectionError(props);
    if (code.startsWith("28")) return new SqlError.AuthenticationError(props);
    if (code === "42501") return new SqlError.AuthorizationError(props);
    if (code.startsWith("42")) return new SqlError.SqlSyntaxError(props);
    if (code === "23505")
      return new SqlError.UniqueViolation({ ...props, constraint: pgConstraintFromCause(cause) });
    if (code.startsWith("23")) return new SqlError.ConstraintError(props);
    if (code === "40P01") return new SqlError.DeadlockError(props);
    if (code === "40001") return new SqlError.SerializationError(props);
    if (code === "55P03") return new SqlError.LockTimeoutError(props);
    if (code === "57014") return new SqlError.StatementTimeoutError(props);
  }
  return new SqlError.UnknownError(props);
};

const passwordRuntime = dsqlSignerLayer({ expiresIn: Duration.minutes(15) }).pipe(
  Layer.provide(AwsCredentialIdentity.providerLayer(fromNodeProviderChain)),
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
              reason: classifyError(cause, "PgClient: Failed to connect", "connect"),
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
