// oxlint-disable typescript/no-explicit-any typescript/no-unsafe-type-assertion typescript/no-non-null-assertion
import * as Array from "effect/Array";
import * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as RcRef from "effect/RcRef";
import * as Redacted from "effect/Redacted";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as String from "effect/String";
import * as Reactivity from "effect/unstable/reactivity";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import * as SqlError from "effect/unstable/sql/SqlError";
import * as Statement from "effect/unstable/sql/Statement";
import * as Pg from "pg";
import * as PgConnString from "pg-connection-string";
import PgCursor from "pg-cursor";

// oxlint-disable-next-line effecttsgo/node-builtin-import
import type { Duplex } from "node:stream";
import type { ConnectionOptions } from "node:tls";
import type * as Duration from "effect/Duration";
import type * as SqlConnection from "effect/unstable/sql/SqlConnection";

export const TypeId = "~@effect/sql-pg/PgClient" as const;
export type TypeId = typeof TypeId;

export interface PgClientConfig {
  readonly url?: Redacted.Redacted | undefined;

  readonly host?: string | undefined;
  readonly port?: number | undefined;
  readonly path?: string | undefined;
  readonly ssl?: boolean | ConnectionOptions | undefined;
  readonly database?: string | undefined;
  readonly username?: string | undefined;
  readonly password?: Redacted.Redacted | undefined;

  readonly connectTimeout?: Duration.Input | undefined;

  readonly stream?: (() => Duplex) | undefined;

  readonly applicationName?: string | undefined;
  readonly spanAttributes?: Record<string, unknown> | undefined;

  readonly transformResultNames?: ((str: string) => string) | undefined;
  readonly transformQueryNames?: ((str: string) => string) | undefined;
  readonly transformJson?: boolean | undefined;
  readonly types?: Pg.CustomTypesConfig | undefined;
}

export interface PgClient extends SqlClient.SqlClient {
  readonly [TypeId]: TypeId;
  readonly config: PgClientConfig;
  readonly json: (_: unknown) => Statement.Fragment;
  readonly listen: (channel: string) => Stream.Stream<string, SqlError.SqlError>;
  readonly notify: (channel: string, payload: string) => Effect.Effect<void, SqlError.SqlError>;
}

Pg.defaults.parseInt8 = true;

export const PgClient = Context.Service<PgClient>("@effect/sql-pg/PgClient");

const cancelEffects = new WeakMap<Pg.PoolClient, Effect.Effect<void> | undefined>();
const makeCancel = (pool: Pg.Pool, client: Pg.PoolClient) => {
  if (cancelEffects.has(client)) {
    return cancelEffects.get(client)!;
  }
  const processId = (client as any).processID;
  const eff =
    processId !== undefined
      ? // query cancellation is best-effort, so we don't fail if it doesn't work
        Effect.callback<void>((resume) => {
          if (pool.ending) return resume(Effect.void);
          pool.query(`SELECT pg_cancel_backend(${processId})`, () => {
            resume(Effect.void);
          });
        }).pipe(Effect.interruptible, Effect.timeoutOption(5000))
      : undefined;
  cancelEffects.set(client, eff);
  return eff;
};

export const layerFrom = <E, R>(
  acquire: Effect.Effect<PgClient, E, R>,
): Layer.Layer<
  PgClient | SqlClient.SqlClient,
  E,
  Exclude<R, Scope.Scope | Reactivity.Reactivity.Reactivity>
> =>
  Layer.effectContext(
    Effect.map(acquire, (client) =>
      Context.make(PgClient, client).pipe(Context.add(SqlClient.SqlClient, client)),
    ),
  ).pipe(Layer.provide(Reactivity.Reactivity.layer)) as any;

const onListenClientError = (_error: Error) => {
  /** no-op */
};

export const fromPool = Effect.fnUntraced(function* (options: {
  readonly acquire: Effect.Effect<Pg.Pool, SqlError.SqlError, Scope.Scope>;

  readonly applicationName?: string | undefined;
  readonly spanAttributes?: Record<string, unknown> | undefined;

  readonly transformResultNames?: ((str: string) => string) | undefined;
  readonly transformQueryNames?: ((str: string) => string) | undefined;
  readonly transformJson?: boolean | undefined;
  readonly types?: Pg.CustomTypesConfig | undefined;
}): Effect.fn.Return<PgClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity.Reactivity> {
  const pool = yield* options.acquire;

  const makeConnection = (client?: Pg.PoolClient) =>
    new ConnectionImpl(
      function runWithClient<A>(
        f: (
          client: Pg.ClientBase,
          resume: (_: Effect.Effect<A, SqlError.SqlError>) => void,
        ) => void,
      ) {
        if (client !== undefined) {
          return Effect.callback<A, SqlError.SqlError>((resume) => {
            f(client, resume);
            return makeCancel(pool, client);
          });
        }
        return Effect.callback<A, SqlError.SqlError>((resume) => {
          let done = false;
          let cancel: Effect.Effect<void> | undefined = undefined;
          let client: Pg.PoolClient | undefined = undefined;
          function onError(cause: Error) {
            cleanup(cause);
            resume(
              Effect.fail(
                new SqlError.SqlError({
                  reason: classifyError(cause, "Connection error", "acquireConnection"),
                }),
              ),
            );
          }
          function cleanup(cause?: Error) {
            if (!done) client?.release(cause);
            done = true;
            client?.off("error", onError);
          }
          pool.connect((cause, client_) => {
            if (cause) {
              return resume(
                Effect.fail(
                  new SqlError.SqlError({
                    reason: classifyError(
                      cause,
                      "Failed to acquire connection",
                      "acquireConnection",
                    ),
                  }),
                ),
              );
            } else if (!client_) {
              return resume(
                Effect.fail(
                  new SqlError.SqlError({
                    reason: new SqlError.ConnectionError({
                      message: "Failed to acquire connection",
                      cause: new Error("No client returned"),
                      operation: "acquireConnection",
                    }),
                  }),
                ),
              );
            } else if (done) {
              client_.release();
              return;
            }
            client = client_;
            client.once("error", onError);
            cancel = makeCancel(pool, client);
            f(client, (eff) => {
              cleanup();
              resume(eff);
            });
          });
          return Effect.suspend(() => {
            if (!cancel) {
              cleanup();
              return Effect.void;
            }
            return Effect.ensuring(cancel, Effect.sync(cleanup));
          });
        });
      },
      client ? Effect.succeed(client) : reserveRaw,
    );

  const reserveRaw = Effect.callback<Pg.PoolClient, SqlError.SqlError, Scope.Scope>((resume) => {
    const fiber = Fiber.getCurrent()!;
    const scope = Context.getUnsafe(fiber.context, Scope.Scope);
    let cause: Error | undefined = undefined;
    function onError(cause_: Error) {
      cause = cause_;
    }
    pool.connect((err, client, release) => {
      if (err) {
        return resume(
          Effect.fail(
            new SqlError.SqlError({
              reason: classifyError(
                err,
                "Failed to acquire connection for transaction",
                "acquireConnection",
              ),
            }),
          ),
        );
      } else if (!client) {
        return resume(
          Effect.fail(
            new SqlError.SqlError({
              reason: new SqlError.ConnectionError({
                message: "Failed to acquire connection for transaction",
                cause: new Error("No client returned"),
                operation: "acquireConnection",
              }),
            }),
          ),
        );
      }
      client.on("error", onError);
      resume(
        Effect.as(
          Scope.addFinalizer(
            scope,
            Effect.sync(() => {
              client.off("error", onError);
              release(cause);
            }),
          ),
          client,
        ),
      );
    });
  });
  const reserve = Effect.map(reserveRaw, makeConnection);

  const listenAcquirer = yield* RcRef.make({
    acquire: Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const client = new Pg.Client(pool.options);
          await client.connect();
          client.on("error", onListenClientError);
          return client;
        },
        catch: (cause) =>
          new SqlError.SqlError({
            reason: classifyError(
              cause,
              "Failed to acquire connection for listen",
              "acquireConnection",
            ),
          }),
      }),
      (client) =>
        Effect.promise(() => {
          client.off("error", onListenClientError);
          return client.end();
        }).pipe(Effect.timeoutOption(1000)),
      { interruptible: true },
    ),
  });

  let config: PgClientConfig = {
    url: pool.options.connectionString ? Redacted.make(pool.options.connectionString) : undefined,
    host: pool.options.host,
    port: pool.options.port,
    database: pool.options.database,
    username: pool.options.user,
    password:
      typeof pool.options.password === "string" ? Redacted.make(pool.options.password) : undefined,
    ssl: pool.options.ssl,
    applicationName: pool.options.application_name,
    types: pool.options.types,
  };
  if (pool.options.connectionString) {
    // @effect-diagnostics-next-line tryCatchInEffectGen:off
    try {
      const parsed = PgConnString.parse(pool.options.connectionString);
      config = {
        ...config,
        host: config.host ?? parsed.host ?? undefined,
        port:
          config.port ??
          (parsed.port ? Option.getOrUndefined(Number.parse(parsed.port)) : undefined),
        username: config.username ?? parsed.user ?? undefined,
        password: config.password ?? (parsed.password ? Redacted.make(parsed.password) : undefined),
        database: config.database ?? parsed.database ?? undefined,
      };
    } catch {
      //
    }
  }

  return yield* makeWith({
    acquirer: Effect.succeed(makeConnection()),
    transactionAcquirer: reserve,
    listenAcquirer: RcRef.get(listenAcquirer),
    config,
    spanAttributes: options.spanAttributes,
    transformResultNames: options.transformResultNames,
    transformQueryNames: options.transformQueryNames,
    transformJson: options.transformJson,
  });
});

export const makeWith = Effect.fnUntraced(function* (options: {
  readonly acquirer: SqlConnection.Acquirer;
  readonly transactionAcquirer: SqlConnection.Acquirer;
  readonly listenAcquirer: Effect.Effect<Pg.ClientBase, SqlError.SqlError, Scope.Scope>;

  readonly config: PgClientConfig;
  readonly spanAttributes?: Record<string, unknown> | undefined;

  readonly transformResultNames?: ((str: string) => string) | undefined;
  readonly transformQueryNames?: ((str: string) => string) | undefined;
  readonly transformJson?: boolean | undefined;
}): Effect.fn.Return<PgClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity.Reactivity> {
  const compiler = makeCompiler(options.transformQueryNames, options.transformJson);
  const transformRows = options.transformResultNames
    ? Statement.defaultTransforms(options.transformResultNames, options.transformJson).array
    : undefined;

  const config = options.config;

  return Object.assign(
    yield* SqlClient.make({
      acquirer: options.acquirer,
      transactionAcquirer: options.transactionAcquirer,
      compiler,
      spanAttributes: [
        ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
        [ATTR_DB_SYSTEM_NAME, "postgresql"],
        [ATTR_DB_NAMESPACE, config.database ?? config.username ?? "postgres"],
        [ATTR_SERVER_ADDRESS, config.host ?? "localhost"],
        [ATTR_SERVER_PORT, config.port ?? 5432],
      ],
      transformRows,
    }),
    {
      [TypeId]: TypeId,
      config: options.config,
      json: (_: unknown) => Statement.fragment([PgJson(_)]),
      listen: (channel: string) =>
        Stream.callback<string, SqlError.SqlError>(
          Effect.fnUntraced(function* (queue) {
            const client = yield* options.listenAcquirer;
            function onNotification(msg: Pg.Notification) {
              if (msg.channel === channel && msg.payload) {
                Queue.offerUnsafe(queue, msg.payload);
              }
            }
            yield* Effect.addFinalizer(() =>
              Effect.promise(() => {
                client.off("notification", onNotification);
                return client.query(`UNLISTEN ${Pg.escapeIdentifier(channel)}`);
              }),
            );
            yield* Effect.tryPromise({
              try: () => client.query(`LISTEN ${Pg.escapeIdentifier(channel)}`),
              catch: (cause) =>
                new SqlError.SqlError({
                  reason: classifyError(cause, "Failed to listen", "listen"),
                }),
            });
            client.on("notification", onNotification);
          }),
        ),
      notify: (channel: string, payload: string) =>
        Effect.asVoid(
          Effect.scoped(
            Effect.flatMap(options.acquirer, (conn) =>
              conn.executeRaw(`SELECT pg_notify($1, $2)`, [channel, payload]),
            ),
          ),
        ),
    },
  );
});

class ConnectionImpl implements SqlConnection.Connection {
  public constructor(
    runWithClient: <A>(
      f: (client: Pg.ClientBase, resume: (_: Effect.Effect<A, SqlError.SqlError>) => void) => void,
    ) => Effect.Effect<A, SqlError.SqlError>,
    reserve: Effect.Effect<Pg.ClientBase, SqlError.SqlError, Scope.Scope>,
  ) {
    this.runWithClient = runWithClient;
    this.reserve = reserve;
  }

  private readonly runWithClient: <A>(
    f: (client: Pg.ClientBase, resume: (_: Effect.Effect<A, SqlError.SqlError>) => void) => void,
  ) => Effect.Effect<A, SqlError.SqlError>;
  private readonly reserve: Effect.Effect<Pg.ClientBase, SqlError.SqlError, Scope.Scope>;

  private run(query: string, params: ReadonlyArray<unknown>) {
    return this.runWithClient<ReadonlyArray<any>>((client, resume) => {
      client.query(query, params as any, (err, result) => {
        if (err) {
          resume(
            Effect.fail(
              new SqlError.SqlError({
                reason: classifyError(err, "Failed to execute statement", "execute"),
              }),
            ),
          );
        } else {
          // Multi-statement queries return an array of results
          resume(
            Effect.succeed(
              Array.isArray(result) ? result.map((r: any) => r.rows ?? []) : (result.rows ?? []),
            ),
          );
        }
      });
    });
  }

  public execute(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
  ) {
    return transformRows ? Effect.map(this.run(sql, params), transformRows) : this.run(sql, params);
  }
  public executeRaw(sql: string, params: ReadonlyArray<unknown>) {
    return this.runWithClient<Pg.Result>((client, resume) => {
      client.query(sql, params as any, (err, result) => {
        if (err) {
          resume(
            Effect.fail(
              new SqlError.SqlError({
                reason: classifyError(err, "Failed to execute statement", "execute"),
              }),
            ),
          );
        } else {
          resume(Effect.succeed(result));
        }
      });
    });
  }
  public executeWithoutTransform(sql: string, params: ReadonlyArray<unknown>) {
    return this.run(sql, params);
  }
  public executeValues(sql: string, params: ReadonlyArray<unknown>) {
    return this.runWithClient<ReadonlyArray<any>>((client, resume) => {
      client.query(
        {
          text: sql,
          rowMode: "array",
          values: params as Array<string>,
        },
        (err, result) => {
          if (err) {
            resume(
              Effect.fail(
                new SqlError.SqlError({
                  reason: classifyError(err, "Failed to execute statement", "execute"),
                }),
              ),
            );
          } else {
            resume(Effect.succeed(result.rows));
          }
        },
      );
    });
  }
  public executeValuesUnprepared(sql: string, params: ReadonlyArray<unknown>) {
    return this.executeValues(sql, params);
  }
  public executeUnprepared(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
  ) {
    return this.execute(sql, params, transformRows);
  }
  public executeStream(
    sql: string,
    params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
  ) {
    // oxlint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return Stream.fromChannel(
      Channel.fromTransform(
        Effect.fnUntraced(function* (_, scope) {
          const client = yield* Scope.provide(self.reserve, scope);
          yield* Scope.addFinalizer(
            scope,
            Effect.promise(() => cursor.close()),
          );
          const cursor = client.query(new PgCursor(sql, params as any));
          // @effect-diagnostics-next-line returnEffectInGen:off
          return Effect.callback<Array.NonEmptyReadonlyArray<any>, SqlError.SqlError | Cause.Done>(
            (resume) => {
              cursor.read(128, (err, rows) => {
                if (err) {
                  resume(
                    Effect.fail(
                      new SqlError.SqlError({
                        reason: classifyError(err, "Failed to execute statement", "stream"),
                      }),
                    ),
                  );
                } else if (Array.isArrayNonEmpty(rows)) {
                  resume(Effect.succeed(transformRows ? (transformRows(rows) as any) : rows));
                } else {
                  resume(Cause.done());
                }
              });
            },
          );
        }),
      ),
    );
  }
}

export const makeCompiler = (
  transform?: (_: string) => string,
  transformJson = true,
): Statement.Compiler => {
  const transformValue =
    transformJson && transform ? Statement.defaultTransforms(transform).value : undefined;

  return Statement.makeCompiler<PgCustom>({
    dialect: "pg",
    placeholder(_) {
      return `$${_}`;
    },
    onIdentifier: transform
      ? function (value, withoutTransform) {
          return withoutTransform ? escape(value) : escape(transform(value));
        }
      : escape,
    onRecordUpdate(placeholders, valueAlias, valueColumns, values, returning) {
      return [
        `(values ${placeholders}) AS ${valueAlias}${valueColumns}${returning ? ` RETURNING ${returning[0]}` : ""}`,
        returning ? values.flat().concat(returning[1]) : values.flat(),
      ];
    },
    onCustom(type, placeholder, withoutTransform) {
      // oxlint-disable-next-line default-case
      switch (type.kind) {
        case "PgJson": {
          return [
            placeholder(undefined),
            [
              withoutTransform || transformValue === undefined
                ? type.paramA
                : transformValue(type.paramA),
            ],
          ];
        }
      }
    },
  });
};

export type PgCustom = PgJson;

type PgJson = Statement.Custom<"PgJson", unknown>;

const PgJson = Statement.custom<PgJson>("PgJson");

const ATTR_DB_SYSTEM_NAME = "db.system.name";
const ATTR_DB_NAMESPACE = "db.namespace";
const ATTR_SERVER_ADDRESS = "server.address";
const ATTR_SERVER_PORT = "server.port";

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
