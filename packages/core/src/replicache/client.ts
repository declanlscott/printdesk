import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Record from "effect/Record";
import * as Runtime from "effect/Runtime";
import * as Schema from "effect/Schema";
import { Replicache as _Replicache } from "replicache";

import { Actors } from "../actors";
import { ApiContract } from "../api/contract";
import { Database } from "../database/client";
import { Mutations } from "../mutations/client";
import { Procedures } from "../procedures";
import { separatedString } from "../utils";
import {
  ReplicacheContract,
  ReplicachePullerContract,
  ReplicachePusherContract,
} from "./contracts";

import type { ParseError } from "effect/ParseResult";
import type {
  LogLevel,
  Puller,
  PullerResult,
  Pusher,
  ReadTransaction,
  ReplicacheOptions,
  SubscribeOptions,
  WriteTransaction,
} from "replicache";
import type { AccessControl } from "../access-control";

export namespace Replicache {
  type Mutators = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tx: WriteTransaction, args?: any) => any
  >;

  type InferMutator<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TMutator extends (tx: WriteTransaction, ...args: Array<any>) => any,
  > = TMutator extends (
    tx: WriteTransaction,
    ...args: infer TArgs
  ) => infer TReturn
    ? (
        ...args: TArgs
      ) => TReturn extends Promise<Awaited<TReturn>>
        ? TReturn
        : Promise<TReturn>
    : never;

  type InferMutate<TMutators extends Mutators> = {
    readonly [TKey in keyof TMutators]: InferMutator<TMutators[TKey]>;
  };

  export interface Options<
    TMutators extends Mutators,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  > extends ReplicacheOptions<{}> {
    mutators: TMutators;
  }

  export class Client<TMutators extends Mutators> extends _Replicache {
    constructor(opts: Options<TMutators>) {
      super(opts);
    }

    override get mutate() {
      return super.mutate as InferMutate<TMutators>;
    }
  }

  export class ReplicacheError extends Data.TaggedError("ReplicacheError")<{
    readonly cause: unknown;
  }> {}

  export class MutateError extends Data.TaggedError("MutateError")<{
    readonly cause: unknown;
  }> {}

  export interface MakeArgs {
    logLevel: LogLevel;
    baseUrl: URL;
  }

  export const make = ({ logLevel, baseUrl }: MakeArgs) =>
    Effect.gen(function* () {
      const { record: mutations } = yield* Procedures.Mutations.registry;

      const Api = yield* ApiContract.Application;
      const { pull, push } = yield* HttpClient.HttpClient.pipe(
        Effect.map(HttpClient.filterStatusOk),
        Effect.flatMap((httpClient) =>
          HttpApiClient.group(Api, {
            baseUrl,
            httpClient,
            group: "replicache",
          }),
        ),
      );

      const PushRequest = yield* ReplicachePusherContract.Request;

      const makeName = separatedString().pipe(Schema.encode);

      const decodeCookie = ReplicachePullerContract.Cookie.pipe(
        Schema.decodeUnknown,
      );

      const puller = (...[request, id]: Parameters<Puller>) =>
        decodeCookie(request.cookie).pipe(
          Effect.map((cookie) => ({ ...request, cookie })),
          Effect.flatMap(Schema.decode(ReplicachePullerContract.Request)),
          Effect.filterOrFail(
            ReplicachePullerContract.isRequestV1,
            () => new ReplicacheContract.VersionNotSupportedError("pull"),
          ),
          Effect.flatMap((payload) =>
            pull({
              payload,
              headers: { "X-Replicache-RequestID": id },
              withResponse: true,
            }),
          ),
          Effect.map(
            ([response, { status: httpStatusCode }]) =>
              ({
                response,
                httpRequestInfo: {
                  httpStatusCode,
                  errorMessage: "",
                },
              }) as PullerResult,
          ),
          Effect.catchTag("ResponseError", (e) =>
            Effect.succeed({
              httpRequestInfo: {
                httpStatusCode: e.response.status,
                errorMessage: e.message,
              },
            }),
          ),
          Effect.orDie,
          Effect.runPromise,
        );

      const pusher = (...[request, id]: Parameters<Pusher>) =>
        Effect.succeed(request).pipe(
          Effect.flatMap(Schema.decode(PushRequest)),
          Effect.filterOrFail(
            ReplicachePusherContract.isRequestV1,
            () => new ReplicacheContract.VersionNotSupportedError("push"),
          ),
          Effect.flatMap((payload) =>
            push({
              payload,
              headers: { "X-Replicache-RequestID": id },
              withResponse: true,
            }),
          ),
          Effect.map(([response, { status: httpStatusCode }]) => ({
            response,
            httpRequestInfo: {
              httpStatusCode,
              errorMessage: "",
            },
          })),
          Effect.catchTag("ResponseError", (e) =>
            Effect.succeed({
              httpRequestInfo: {
                httpStatusCode: e.response.status,
                errorMessage: e.message,
              },
            }),
          ),
          Effect.orDie,
          Effect.runPromise,
        );

      const initialize = Effect.gen(function* () {
        const user = yield* Actors.Actor.pipe(
          Effect.flatMap((actor) => actor.assert("UserActor")),
        );
        const name = yield* makeName([user.tenantId, user.id]);

        const mutatorRuntime = Actors.Actor.userLayer(
          user.id,
          user.tenantId,
          user.role,
        ).pipe(Layer.merge(Mutations.Dispatcher.Default), ManagedRuntime.make);

        const mutators = Record.map(
          mutations,
          ({ name, Args: _Args }) =>
            (tx: WriteTransaction, args: (typeof _Args)["Type"]) =>
              Mutations.Dispatcher.client.pipe(
                Effect.flatMap((client) => client.dispatch(name, args)),
                Effect.provideService(Database.ReadTransaction, tx),
                Effect.provideService(Database.WriteTransaction, tx),
                mutatorRuntime.runPromise,
              ),
        ) as {
          readonly [TKey in keyof typeof mutations]: (
            tx: WriteTransaction,
            args: (typeof mutations)[TKey]["Args"]["Type"],
          ) => Promise<(typeof mutations)[TKey]["Returns"]["Type"]>;
        };

        const client = yield* Effect.try({
          try: () =>
            new Client({
              name,
              logLevel,
              mutators,
              puller,
              pusher,
            }),
          catch: (cause) => new ReplicacheError({ cause }),
        });

        const query = <TSuccess, TError, TContext>(
          body: Effect.Effect<
            TSuccess,
            TError,
            TContext | Database.ReadTransaction
          >,
        ) =>
          Effect.runtime<TContext>().pipe(
            Effect.flatMap((runtime) =>
              Effect.tryPromise({
                try: (signal) =>
                  client.query((tx) =>
                    body.pipe(
                      Effect.provideService(Database.ReadTransaction, tx),
                      (body) => Runtime.runPromise(runtime, body, { signal }),
                    ),
                  ),
                // Propagate errors back into effect
                catch: (exception) => {
                  if (Runtime.isFiberFailure(exception)) {
                    const cause = exception[Runtime.FiberFailureCauseId];

                    if (Cause.isFailure(cause) && Cause.isFailType(cause))
                      return cause.error as TError;

                    return new ReplicacheError({ cause });
                  }

                  return new ReplicacheError({ cause: exception });
                },
              }),
            ),
          );

        const subscribe = <TSuccess, TError, TContext>(
          body: Effect.Effect<
            TSuccess,
            TError,
            TContext | Database.ReadTransaction
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
                        Effect.provideService(Database.ReadTransaction, tx),
                        (body) => Runtime.runPromise(runtime, body),
                      ),
                    { ...opts, isEqual: Equal.equals<TSuccess, TSuccess> },
                  ),
                catch: (cause) => new ReplicacheError({ cause }),
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

                return new ReplicacheError({ cause });
              }

              return new ReplicacheError({ cause: exception });
            },
          });

        const pull = Effect.tryPromise({
          try: () => client.pull(),
          catch: (cause) => new ReplicacheError({ cause }),
        });

        const close = Effect.tryPromise({
          try: () => client.close(),
          catch: (cause) => new ReplicacheError({ cause }),
        });

        return { query, subscribe, mutate, pull, close } as const;
      });

      return { initialize } as const;
    });

  export class Replicache extends Effect.Tag(
    "@printdesk/core/replicache/client/Replicache",
  )<Replicache, Effect.Effect.Success<ReturnType<typeof make>>>() {}
}
