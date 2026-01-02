import { Actors } from "@printdesk/core/actors";
import { Mutations } from "@printdesk/core/mutations/client";
import { Procedures } from "@printdesk/core/procedures";
import { Replicache } from "@printdesk/core/replicache/client";
import { separatedString } from "@printdesk/core/utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Runtime from "effect/Runtime";
import * as Schema from "effect/Schema";

import { ViteResource } from "./sst";

import type { AccessControl } from "@printdesk/core/access-control";
import type { ParseError } from "effect/ParseResult";
import type {
  ReadTransaction,
  SubscribeOptions,
  WriteTransaction,
} from "replicache";

export class ReplicacheClient extends Effect.Service<ReplicacheClient>()(
  "@printdesk/clients/web/replicache/Client",
  {
    dependencies: [ViteResource.Default, Procedures.Mutations.Default],
    effect: Effect.gen(function* () {
      const resource = yield* ViteResource;
      const { record: mutations } = yield* Procedures.Mutations.registry;

      const makeName = Schema.encode(separatedString());

      const make = Effect.gen(function* () {
        const user = yield* Actors.Actor.pipe(
          Effect.flatMap((actor) => actor.assert("UserActor")),
        );
        const name = yield* makeName([user.tenantId, user.id]);

        const logLevel = resource.AppData.pipe(Redacted.value).isDevMode
          ? "info"
          : "error";

        const mutatorRuntime = Actors.Actor.userLayer(
          user.id,
          user.tenantId,
          user.role,
        ).pipe(ManagedRuntime.make);

        const mutators = Record.map(
          mutations,
          (mutation) =>
            (tx: WriteTransaction, args: (typeof mutation.Args)["Type"]) =>
              Mutations.Dispatcher.client.pipe(
                Effect.flatMap((client) =>
                  client.dispatch(mutation.name, { decoded: args }, user),
                ),
                Effect.provide(
                  Mutations.Dispatcher.Default.pipe(
                    Layer.provide(Replicache.ReadTransaction.Default(tx)),
                    Layer.provide(Replicache.WriteTransaction.Default(tx)),
                  ),
                ),
                mutatorRuntime.runPromise,
              ),
        ) as {
          readonly [TKey in keyof typeof mutations]: (
            tx: WriteTransaction,
            args: (typeof mutations)[TKey]["Args"]["Type"],
          ) => Promise<(typeof mutations)[TKey]["Returns"]["Type"]>;
        };

        const apiBaseUrl = new URL(
          `https://${resource.Domains.pipe(Redacted.value).api}`,
        );

        const client = yield* Effect.try({
          try: () =>
            new Replicache.Client({
              name,
              logLevel,
              mutators,
              // TODO: Add other options
            }),
          catch: (cause) => new Replicache.ClientError({ cause }),
        });

        const query = <TSuccess, TError, TContext>(
          body: Effect.Effect<
            TSuccess,
            TError,
            TContext | Replicache.ReadTransaction
          >,
        ) =>
          Effect.runtime<TContext>().pipe(
            Effect.flatMap((runtime) =>
              Effect.tryPromise({
                try: (signal) =>
                  client.query((tx: ReadTransaction) =>
                    body.pipe(
                      Effect.provide(Replicache.ReadTransaction.Default(tx)),
                      (body) => Runtime.runPromise(runtime, body, { signal }),
                    ),
                  ),
                // Propagate errors back into effect
                catch: (exception) => {
                  if (Runtime.isFiberFailure(exception)) {
                    const cause = exception[Runtime.FiberFailureCauseId];

                    if (Cause.isFailure(cause) && Cause.isFailType(cause))
                      return cause.error as TError;

                    return new Replicache.ClientError({ cause });
                  }

                  return new Replicache.ClientError({ cause: exception });
                },
              }),
            ),
          );

        const subscribe = <TSuccess, TError, TContext>(
          body: Effect.Effect<
            TSuccess,
            TError,
            TContext | Replicache.ReadTransaction
          >,
          opts: Omit<SubscribeOptions<TSuccess>, "isEqual">,
        ) =>
          Effect.runtime<TContext>().pipe(
            Effect.flatMap((runtime) =>
              Effect.try({
                try: () =>
                  client.subscribe(
                    (tx: ReadTransaction) =>
                      body.pipe(
                        Effect.provide(Replicache.ReadTransaction.Default(tx)),
                        (body) => Runtime.runPromise(runtime, body),
                      ),
                    {
                      ...opts,
                      isEqual: Equal.equals<TSuccess, TSuccess>,
                    },
                  ),
                catch: (cause) => new Replicache.ClientError({ cause }),
              }),
            ),
          );

        const mutate = <TName extends keyof typeof mutations>(
          name: TName,
          args: (typeof mutations)[TName]["Args"]["Type"],
        ) =>
          Effect.tryPromise({
            try: () => Promise.resolve(client.mutate[name](args)),
            // Propagate errors back into effect
            catch: (exception) => {
              if (Runtime.isFiberFailure(exception)) {
                const cause = exception[Runtime.FiberFailureCauseId];

                if (Cause.isFailure(cause) && Cause.isFailType(cause))
                  return cause.error as
                    | ParseError
                    | Effect.Effect.Error<
                        AccessControl.Policy<
                          Effect.Effect.Success<
                            typeof Mutations.Dispatcher.client
                          >["Record"][TName]["PolicyError"]
                        >
                      >
                    | Effect.Effect.Success<
                        typeof Mutations.Dispatcher.client
                      >["Record"][TName]["MutatorError"];

                return new Replicache.ClientError({ cause });
              }

              return new Replicache.ClientError({ cause: exception });
            },
          });

        const pull = Effect.tryPromise({
          try: () => client.pull(),
          catch: (cause) => new Replicache.ClientError({ cause }),
        });

        const close = Effect.tryPromise({
          try: () => client.close(),
          catch: (cause) => new Replicache.ClientError({ cause }),
        });

        return { query, subscribe, mutate, pull, close } as const;
      });

      return { make } as const;
    }),
  },
) {
  static readonly runtime = this.Default.pipe(ManagedRuntime.make);
}
