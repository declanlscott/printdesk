import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";

import { Replicache } from ".";
import { Actor } from "../../actors";
import * as AnnouncementsMutations from "../../announcements/client/mutations/layer";
import * as AnnouncementsPolicies from "../../announcements/client/policies/layer";
import * as AnnouncementsReadRepository from "../../announcements/client/read-repository/layer";
import * as AnnouncementsWriteRepository from "../../announcements/client/write-repository/layer";
import { Api } from "../../api";
import * as CommentsMutations from "../../comments/client/mutations/layer";
import * as CommentsPolicies from "../../comments/client/policies/layer";
import * as CommentsReadRepository from "../../comments/client/read-repository/layer";
import * as CommentsWriteRepository from "../../comments/client/write-repository/layer";
import { ReadTransaction, ReadTransactionManager } from "../../database/client/read-transaction";
import { WriteTransaction, WriteTransactionManager } from "../../database/client/write-transaction";
import * as DeliveryOptionsMutations from "../../delivery-options/client/mutations/layer";
import * as DeliveryOptionsPolicies from "../../delivery-options/client/policies/layer";
import * as DeliveryOptionsReadRepository from "../../delivery-options/client/read-repository/layer";
import * as DeliveryOptionsWriteRepository from "../../delivery-options/client/write-repository/layer";
import * as InvoicesMutations from "../../invoices/client/mutations/layer";
import * as InvoicesReadRepository from "../../invoices/client/read-repository/layer";
import * as InvoicesWriteRepository from "../../invoices/client/write-repository/layer";
import { MutationsDispatcher } from "../../mutations/client/dispatcher";
import { layer as baseMutationsDispatcherLayer } from "../../mutations/client/dispatcher/layer";
import * as OrdersMutations from "../../orders/client/mutations/layer";
import * as OrdersPolicies from "../../orders/client/policies/layer";
import * as OrdersReadRepository from "../../orders/client/read-repository/layer";
import * as OrdersWriteRepository from "../../orders/client/write-repository/layer";
import { Mutations } from "../../procedures/mutations";
import * as ProductsMutations from "../../products/client/mutations/layer";
import * as ProductsPolicies from "../../products/client/policies/layer";
import * as ProductsReadRepository from "../../products/client/read-repository/layer";
import * as ProductsWriteRepository from "../../products/client/write-repository/layer";
import * as RoomsMutations from "../../rooms/client/mutations/layer";
import * as RoomsPolicies from "../../rooms/client/policies/layer";
import * as RoomsReadRepository from "../../rooms/client/read-repository/layer";
import * as RoomsWriteRepository from "../../rooms/client/write-repository/layer";
import * as SharedAccountCustomerAccessReadRepository from "../../shared-accounts/client/customer-access/read-repository/layer";
import * as SharedAccountCustomerGroupAccessReadRepository from "../../shared-accounts/client/customer-group-access/read-repository/layer";
import * as SharedAccountManagerAccessMutations from "../../shared-accounts/client/manager-access/mutations/layer";
import * as SharedAccountManagerAccessPolicies from "../../shared-accounts/client/manager-access/policies/layer";
import * as SharedAccountManagerAccessReadRepository from "../../shared-accounts/client/manager-access/read-repository/layer";
import * as SharedAccountManagerAccessWriteRepository from "../../shared-accounts/client/manager-access/write-repository/layer";
import * as SharedAccountsMutations from "../../shared-accounts/client/mutations/layer";
import * as SharedAccountsPolicies from "../../shared-accounts/client/policies/layer";
import * as SharedAccountsReadRepository from "../../shared-accounts/client/read-repository/layer";
import * as SharedAccountsWriteRepository from "../../shared-accounts/client/write-repository/layer";
import * as TenantsMutations from "../../tenants/client/mutations/layer";
import * as TenantsReadRepository from "../../tenants/client/read-repository/layer";
import * as TenantsWriteRepository from "../../tenants/client/write-repository/layer";
import * as UsersMutations from "../../users/client/mutations/layer";
import * as UsersPolicies from "../../users/client/policies/layer";
import * as UsersReadRepository from "../../users/client/read-repository/layer";
import * as UsersWriteRepository from "../../users/client/write-repository/layer";
import { separatedString } from "../../utils";
import * as RoomWorkflowsReadRepository from "../../workflows/client/room/read-repository/layer";
import * as RoomWorkflowsWriteRepository from "../../workflows/client/room/write-repository/layer";
import * as SharedAccountWorkflowsPolicies from "../../workflows/client/shared-account/policies/layer";
import * as SharedAccountWorkflowsReadRepository from "../../workflows/client/shared-account/read-repository/layer";
import * as WorkflowStatusesMutations from "../../workflows/client/status/mutations/layer";
import * as WorkflowStatusesPolicies from "../../workflows/client/status/policies/layer";
import * as WorkflowStatusesReadRepository from "../../workflows/client/status/read-repository/layer";
import * as WorkflowStatusesWriteRepository from "../../workflows/client/status/write-repository/layer";
import {
  ReplicacheContract,
  ReplicachePullerContract,
  ReplicachePusherContract,
} from "../contracts";

import type {
  Puller,
  PullerResult,
  Pusher,
  PusherResult,
  SubscribeOptions,
  WriteTransaction as WriteTx,
} from "replicache";
import type { LogLevel } from "replicache";

export type ServiceShape = Effect.Success<ReturnType<typeof makeService>>;

export const mutationsDispatcherLayer = baseMutationsDispatcherLayer.pipe(
  Layer.provide([
    AnnouncementsMutations.layer,
    CommentsMutations.layer,
    DeliveryOptionsMutations.layer,
    InvoicesMutations.layer,
    OrdersMutations.layer,
    ProductsMutations.layer,
    RoomsMutations.layer,
    SharedAccountsMutations.layer,
    SharedAccountManagerAccessMutations.layer,
    TenantsMutations.layer,
    UsersMutations.layer,
    WorkflowStatusesMutations.layer,
  ]),
  Layer.provide([
    AnnouncementsPolicies.layer,
    CommentsPolicies.layer,
    DeliveryOptionsPolicies.layer,
    OrdersPolicies.layer,
    ProductsPolicies.layer,
    RoomsPolicies.layer,
    SharedAccountsPolicies.layer,
    SharedAccountManagerAccessPolicies.layer,
    UsersPolicies.layer,
    WorkflowStatusesPolicies.layer,
  ]),
  Layer.provide(SharedAccountWorkflowsPolicies.layer),
  Layer.provide([
    AnnouncementsWriteRepository.layer,
    CommentsWriteRepository.layer,
    DeliveryOptionsWriteRepository.layer,
    InvoicesWriteRepository.layer,
    OrdersWriteRepository.layer,
    ProductsWriteRepository.layer,
    RoomsWriteRepository.layer,
    SharedAccountsWriteRepository.layer,
    SharedAccountManagerAccessWriteRepository.layer,
    TenantsWriteRepository.layer,
    UsersWriteRepository.layer,
    RoomWorkflowsWriteRepository.layer,
    WorkflowStatusesWriteRepository.layer,
  ]),
  Layer.provide([
    AnnouncementsReadRepository.layer,
    CommentsReadRepository.layer,
    DeliveryOptionsReadRepository.layer,
    InvoicesReadRepository.layer,
    OrdersReadRepository.layer,
    ProductsReadRepository.layer,
    RoomsReadRepository.layer,
    SharedAccountsReadRepository.layer,
    TenantsReadRepository.layer,
    UsersReadRepository.layer,
    RoomWorkflowsReadRepository.layer,
    SharedAccountWorkflowsReadRepository.layer,
  ]),
  Layer.provide([
    WorkflowStatusesReadRepository.layer,
    SharedAccountManagerAccessReadRepository.layer,
    SharedAccountCustomerAccessReadRepository.layer,
    SharedAccountManagerAccessReadRepository.layer,
    SharedAccountCustomerGroupAccessReadRepository.layer,
  ]),
  Layer.provide(WriteTransactionManager.layer),
  Layer.provide(ReadTransactionManager.layer),
);

export const makeService = Effect.fn(function* ({
  baseUrl,
  logLevel,
}: {
  baseUrl: URL;
  logLevel: LogLevel;
}) {
  const user = yield* Actor.pipe(Effect.flatMap(Struct.get("assertUser")));

  const name = yield* Schema.encodeEffect(separatedString())([user.tenantId, user.id]);

  const mutatorRuntime = Actor.layer(user).pipe(
    Layer.merge(mutationsDispatcherLayer),
    ManagedRuntime.make,
  );

  const mutators = Record.map(
    Mutations.registry.record,
    (mutation) => (tx: WriteTx, args: typeof mutation.Args.Type) =>
      MutationsDispatcher.use((dispatcher) => dispatcher.dispatch(mutation.name, args)).pipe(
        Effect.provideService(ReadTransaction, tx),
        Effect.provideService(WriteTransaction, tx),
        mutatorRuntime.runPromiseExit,
      ),
  ) as {
    readonly [TKey in keyof Mutations.Record]: (
      tx: WriteTx,
      args: Mutations.Record[TKey]["Args"]["Type"],
    ) => Promise<
      Exit.Exit<
        Mutations.Record[TKey]["Returns"]["Type"],
        Effect.Error<ReturnType<typeof MutationsDispatcher.Service.dispatch<TKey>>>
      >
    >;
  };

  const api = yield* HttpClient.HttpClient.pipe(
    Effect.map(HttpClient.filterStatusOk),
    Effect.flatMap((httpClient) =>
      HttpApiClient.group(Api, { baseUrl, httpClient, group: "replicache" }),
    ),
  );

  const decodeCookie = ReplicachePullerContract.Cookie.pipe(Schema.decodeUnknownEffect);

  const puller = (...[request, id]: Parameters<Puller>) =>
    decodeCookie(request.cookie).pipe(
      Effect.map((cookie) => ({ ...request, cookie })),
      Effect.flatMap(Schema.decodeEffect(ReplicachePullerContract.Request)),
      Effect.filterOrElse(ReplicachePullerContract.isRequestV1, () =>
        Effect.die(ReplicacheContract.VersionNotSupportedError.new("pull")),
      ),
      Effect.flatMap((payload) =>
        api.pull({
          payload,
          headers: { "X-Replicache-RequestID": id },
          responseMode: "decoded-and-response",
        }),
      ),
      Effect.map(([response, { status: httpStatusCode }]) => ({
        response,
        httpRequestInfo: { httpStatusCode, errorMessage: "" },
      })),
      Effect.catchReason("HttpClientError", "StatusCodeError", (error) =>
        Effect.succeed({
          httpRequestInfo: {
            httpStatusCode: error.response.status,
            errorMessage: error.message,
          },
        }),
      ),
      Effect.catch((error) =>
        Effect.succeed({
          httpRequestInfo: {
            httpStatusCode: "response" in error ? (error.response?.status ?? 500) : 500,
            errorMessage: "message" in error ? error.message : "An unknown error occurred",
          },
        }),
      ),
      Effect.runPromise,
    ) as Promise<PullerResult>;

  const pusher = (...[request, id]: Parameters<Pusher>) =>
    Effect.succeed(request).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(ReplicachePusherContract.Request)),
      Effect.filterOrElse(ReplicachePusherContract.isRequestV1, () =>
        Effect.die(ReplicacheContract.VersionNotSupportedError.new("push")),
      ),
      Effect.flatMap((payload) =>
        api.push({
          payload,
          headers: { "X-Replicache-RequestID": id },
          responseMode: "decoded-and-response",
        }),
      ),
      Effect.map(([response, { status: httpStatusCode }]) => ({
        response,
        httpRequestInfo: { httpStatusCode, errorMessage: "" },
      })),
      Effect.catchReason("HttpClientError", "StatusCodeError", (error) =>
        Effect.succeed({
          httpRequestInfo: {
            httpStatusCode: error.response.status,
            errorMessage: error.message,
          },
        }),
      ),
      Effect.catch((error) =>
        Effect.succeed({
          httpRequestInfo: {
            httpStatusCode: "response" in error ? (error.response?.status ?? 500) : 500,
            errorMessage: "message" in error ? error.message : "An unknown error occurred",
          },
        }),
      ),
      Effect.runPromise,
    ) as Promise<PusherResult>;

  const client = yield* Effect.try({
    try: () => new Replicache.Client({ name, mutators, puller, pusher, logLevel }),
    catch: (cause) => new Replicache.ClientError({ cause }),
  });

  const clientGroupId = Effect.tryPromise({
    try: () => client.clientGroupID,
    catch: (cause) => new Replicache.ClientError({ cause }),
  }).pipe(Effect.flatMap(ReplicacheContract.ClientGroupId.makeEffect));

  const query = <TSuccess, TError, TServices>(
    query: Effect.Effect<TSuccess, TError, TServices | ReadTransaction>,
  ) =>
    Effect.context<TServices>().pipe(
      Effect.flatMap((context) =>
        Effect.tryPromise({
          try: (signal) =>
            client.query((tx) =>
              query.pipe(Effect.provideService(ReadTransaction, tx), (query) =>
                Effect.runPromiseExitWith(context)(query, { signal }),
              ),
            ),
          catch: (cause) => new Replicache.QueryError({ cause }),
        }),
      ),
      Effect.flatMap(
        Exit.match({
          onSuccess: Effect.succeed<TSuccess>,
          // Propagate errors back into effect
          onFailure: (cause) =>
            cause.pipe(
              Cause.findError,
              Result.match({ onSuccess: Effect.fail<TError>, onFailure: Effect.die }),
            ),
        }),
      ),
    );

  const subscribe = <TSuccess, TError, TServices>(
    query: Effect.Effect<TSuccess, TError, TServices | ReadTransaction>,
    opts: Omit<SubscribeOptions<TSuccess>, "isEqual">,
  ) =>
    Effect.context<TServices>().pipe(
      Effect.flatMap((context) =>
        Effect.try({
          try: () =>
            client.subscribe(
              (tx) =>
                query.pipe(
                  Effect.provideService(ReadTransaction, tx),
                  Effect.runPromiseWith(context),
                ),
              { ...opts, isEqual: Equal.equals },
            ),
          catch: (cause) => new Replicache.SubscribeError({ cause }),
        }),
      ),
      Effect.map(Effect.sync),
    );

  const mutate = <TName extends keyof Mutations.Record>(
    name: TName,
    args: Mutations.Record[TName]["Args"]["Type"],
  ) =>
    Effect.tryPromise({
      try: () => client.mutate[name](args),
      catch: (cause) => new Replicache.MutateError({ cause }),
    }).pipe(
      Effect.flatMap(
        Exit.match({
          onSuccess: Effect.succeed,
          // Propagate errors back into effect
          onFailure: (cause) =>
            cause.pipe(
              Cause.findError,
              Result.match({ onSuccess: Effect.fail, onFailure: Effect.die }),
            ),
        }),
      ),
    );

  const pull = Effect.tryPromise({
    try: () => client.pull(),
    catch: (cause) => new Replicache.PullError({ cause }),
  });

  const close = Effect.tryPromise({
    try: () => client.close(),
    catch: (cause) => new Replicache.CloseError({ cause }),
  });

  return {
    clientGroupId,
    query,
    subscribe,
    mutate,
    pull,
    close,
  } as const;
});

export const layer = (...args: Parameters<typeof makeService>) =>
  makeService(...args).pipe(Layer.effect(Replicache.Replicache));
