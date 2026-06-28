import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import * as PgClient from "@effect/sql-pg/PgClient";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as String from "effect/String";
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

  return Match.value(pgCodeFromCause(cause)).pipe(
    Match.when(Match.undefined, () => new SqlError.UnknownError(props)),
    Match.when(String.startsWith("08"), () => new SqlError.ConnectionError(props)),
    Match.when(String.startsWith("28"), () => new SqlError.AuthenticationError(props)),
    Match.when(Match.is("42501"), () => new SqlError.AuthorizationError(props)),
    Match.when(String.startsWith("42"), () => new SqlError.SqlSyntaxError(props)),
    Match.when(
      Match.is("23505"),
      () => new SqlError.UniqueViolation({ ...props, constraint: pgConstraintFromCause(cause) }),
    ),
    Match.when(String.startsWith("23"), () => new SqlError.ConstraintError(props)),
    Match.when(Match.is("40P01"), () => new SqlError.DeadlockError(props)),
    Match.when(Match.is("40001"), () => new SqlError.SerializationError(props)),
    Match.when(Match.is("55P03"), () => new SqlError.LockTimeoutError(props)),
    Match.when(Match.is("57014"), () => new SqlError.StatementTimeoutError(props)),
    Match.orElse(() => new SqlError.UnknownError(props)),
  );
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
