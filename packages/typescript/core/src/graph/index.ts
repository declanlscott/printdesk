import {
  createGraphServiceClient,
  GraphRequestAdapter,
  type GraphServiceClient,
} from "@microsoft/msgraph-sdk";
import { createGraphClientFactory, getDefaultMiddlewares } from "@microsoft/msgraph-sdk-core";
import "@microsoft/msgraph-sdk-users";
import "@microsoft/msgraph-sdk-groups";
import { version } from "@microsoft/msgraph-sdk/version";
import * as Array from "effect/Array";
import * as Cache from "effect/Cache";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { EntraId } from "../identity/entra-id";
import { Constants } from "../utils/constants";

import type { RequestOption, RequestConfiguration } from "@microsoft/kiota-abstractions";
import type { Middleware } from "@microsoft/kiota-http-fetchlibrary";
import type { CustomerGroupsContract } from "../groups/contracts";
import type { UsersContract } from "../users/contract";

export class GraphError extends Schema.TaggedErrorClass<GraphError>()("GraphError", {
  cause: Schema.Defect(),
}) {}

// oxlint-disable-next-line typescript/no-explicit-any
export type AnyMethod = (...args: Array<any>) => Promise<any>;

export class GraphRequest<TMethod extends AnyMethod = AnyMethod> extends Request.Class<
  { method: TMethod; args: Parameters<TMethod> },
  NonNullable<Awaited<ReturnType<TMethod>>>,
  GraphError | Cause.NoSuchElementError
> {}

export class AbortSignalOption implements RequestOption {
  public static readonly key = "AbortSignalOption";
  public constructor(public signal: AbortSignal) {}
  // oxlint-disable-next-line class-methods-use-this
  public getKey = () => AbortSignalOption.key;
}

export class AbortSignalMiddleware implements Middleware {
  public next: Middleware | undefined;

  public async execute(
    url: string,
    requestInit: RequestInit,
    requestOptions?: Record<string, RequestOption>,
  ) {
    const option = requestOptions?.[AbortSignalOption.key] as AbortSignalOption | undefined;
    if (option) requestInit.signal = option.signal;

    return (
      (await this.next?.execute(url, requestInit, requestOptions)) ??
      Promise.reject(new Error("Next middleware not set"))
    );
  }
}

export class Graph extends Context.Service<Graph>()("@printdesk/core/graph/Graph", {
  make: Effect.gen(function* () {
    const clientCache = yield* Cache.make({
      capacity: 10,
      lookup: (service: typeof EntraId.AuthProvider.Service) =>
        Effect.try({
          try: () =>
            new GraphRequestAdapter(
              service.provider,
              undefined,
              undefined,
              createGraphClientFactory(
                { graphServiceLibraryClientVersion: version },
                undefined,
                undefined,
                [...getDefaultMiddlewares(), new AbortSignalMiddleware()],
              ),
            ),
          catch: (cause) => new GraphError({ cause }),
        }).pipe(
          Effect.andThen((requestAdapter) =>
            Effect.try({
              try: () => createGraphServiceClient(requestAdapter),
              catch: (cause) => new GraphError({ cause }),
            }),
          ),
        ),
    });

    const resolver = RequestResolver.make<GraphRequest>(
      Effect.forEach((entry) =>
        Effect.tryPromise({
          try: (signal) =>
            entry.request.method(
              ...Array.dropRight(entry.request.args, 1),
              Array.last(entry.request.args).pipe(
                Option.match({
                  // oxlint-disable-next-line typescript/no-explicit-any
                  onSome: (config: RequestConfiguration<any>) => ({
                    options: [...(config.options ?? []), new AbortSignalOption(signal)],
                    ...config,
                  }),
                  onNone: () => ({ options: [new AbortSignalOption(signal)] }),
                }),
              ),
            ),
          catch: (cause) => new GraphError({ cause }),
        }).pipe(
          Effect.filterOrFail(Predicate.isNotUndefined),
          Effect.exit,
          Effect.map(entry.completeUnsafe),
        ),
      ),
    ).pipe(
      RequestResolver.setDelay(Constants.GRAPH_REQUEST_BATCH_DELAY),
      RequestResolver.batchN(Constants.GRAPH_REQUEST_BATCH_SIZE),
      RequestResolver.withSpan("Graph.resolver"),
    );

    const batchRequest = Effect.fn("Graph.batchRequest")(
      <TMethod extends AnyMethod>(
        callback: (client: GraphServiceClient) => TMethod,
        ...args: Parameters<TMethod>
      ) =>
        EntraId.AuthProvider.use((service) => clientCache.pipe(Cache.get(service))).pipe(
          Effect.map(callback),
          Effect.flatMap((method) => Effect.request(new GraphRequest({ method, args }), resolver)),
        ),
    );

    const me = batchRequest((client) => client.me.get).pipe(Effect.withSpan("Graph.me"));

    const groups = batchRequest((client) => client.groups.get).pipe(
      Effect.map(Struct.get("value")),
      Effect.filterOrFail(Predicate.isNotNullish),
      Effect.withSpan("Graph.groups"),
    );

    const groupMembers = Effect.fn("Graph.groupMembers")(
      (id: CustomerGroupsContract.ExternalId, transitive: boolean = true) =>
        batchRequest(
          (client) =>
            client.groups.byGroupId(id)[transitive ? "transitiveMembers" : "members"].graphUser.get,
        ).pipe(Effect.map(Struct.get("value")), Effect.filterOrFail(Predicate.isNotNullish)),
    );

    const users = batchRequest((client) => client.users.get).pipe(
      Effect.map(Struct.get("value")),
      Effect.filterOrFail(Predicate.isNotNullish),
      Effect.withSpan("Graph.users"),
    );

    const user = Effect.fn("Graph.user")((id: UsersContract.ExternalId) =>
      batchRequest((client) => client.users.byUserId(id).get),
    );

    const userPhoto = Effect.fn("Graph.userPhoto")((id: UsersContract.ExternalId) =>
      batchRequest((client) => client.users.byUserId(id).photo.content.get),
    );

    return {
      me,
      groups,
      groupMembers,
      users,
      user,
      userPhoto,
    } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
