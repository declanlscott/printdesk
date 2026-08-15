// oxlint-disable typescript/no-explicit-any
import { createGraphServiceClient, GraphRequestAdapter } from "@microsoft/msgraph-sdk";
import { createGraphClientFactory, getDefaultMiddlewares } from "@microsoft/msgraph-sdk-core";
import { version } from "@microsoft/msgraph-sdk/version";
import "@microsoft/msgraph-sdk-groups";
import "@microsoft/msgraph-sdk-serviceprincipals";
import "@microsoft/msgraph-sdk-users";
import * as Array from "effect/Array";
import * as Cache from "effect/Cache";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Redacted from "effect/Redacted";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { EntraId } from "../identity/entra-id";
import { ScimLocator } from "../scim/locator";
import { SstResource } from "../sst/resource";
import { Constants } from "../utils/constants";

import type {
  RequestOption,
  RequestConfiguration,
  BaseRequestBuilder,
} from "@microsoft/kiota-abstractions";
import type { Middleware } from "@microsoft/kiota-http-fetchlibrary";
import type { GraphServiceClient } from "@microsoft/msgraph-sdk";
import type { GroupsContract } from "../groups/contracts";
import type { OauthContract } from "../oauth/contract";
import type { UsersContract } from "../users/contract";

export class GraphError extends Schema.TaggedError<GraphError>()("GraphError", {
  cause: Schema.Defect(),
}) {}

type AnyRequestBuilder = BaseRequestBuilder<any>;

type RequestBuilderMethod<TBuilder extends AnyRequestBuilder> = Extract<
  keyof TBuilder,
  "get" | "post" | "put" | "patch" | "delete"
>;

type RequestBuilderMethodInputOutput<
  TBuilder extends AnyRequestBuilder,
  TMethod extends RequestBuilderMethod<TBuilder>,
> = TBuilder[TMethod] extends (...input: infer TInput) => Promise<infer TOutput>
  ? { input: TInput; output: TOutput }
  : never;

export class GraphRequest<
  TBuilder extends AnyRequestBuilder = any,
  TMethod extends RequestBuilderMethod<TBuilder> = any,
  TInputOutput extends RequestBuilderMethodInputOutput<TBuilder, TMethod> = any,
> extends Request.Class<
  {
    builder: TBuilder;
    method: TMethod;
    input: TInputOutput["input"];
  },
  NonNullable<TInputOutput["output"]>,
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

  public execute(
    url: string,
    requestInit: RequestInit,
    requestOptions?: Record<string, RequestOption>,
  ) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const option = requestOptions?.[AbortSignalOption.key] as AbortSignalOption | undefined;
    if (option) requestInit.signal = option.signal;

    return (
      this.next?.execute(url, requestInit, requestOptions) ??
      Promise.reject(new Error("Next middleware not set"))
    );
  }
}

export class Graph extends Context.Service<Graph>()("@printdesk/core/graph/Graph", {
  make: Effect.gen(function* () {
    const clientCache = yield* Cache.make({
      capacity: 10,
      requireServicesAt: "lookup",
      lookup: (_accessToken: Redacted.Redacted) =>
        EntraId.AuthProvider.use((authProvider) =>
          Effect.try({
            try: () =>
              new GraphRequestAdapter(
                authProvider,
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
          }),
        ).pipe(
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
            entry.request.builder[entry.request.method](
              Array.dropRight(entry.request.input, 1),
              Array.last<any>(entry.request.input).pipe(
                Option.match({
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
          Effect.map((exit) => entry.completeUnsafe(exit)),
        ),
      ),
    ).pipe(
      RequestResolver.setDelay(Constants.GRAPH_REQUEST_BATCH_DELAY),
      RequestResolver.batchN(Constants.GRAPH_REQUEST_BATCH_SIZE),
      RequestResolver.withSpan("Graph.resolver"),
    );

    const batchRequest = Effect.fn("Graph.batchRequest")(
      <TBuilder extends AnyRequestBuilder, TMethod extends RequestBuilderMethod<TBuilder>>(
        getArgs: (client: GraphServiceClient) => {
          builder: TBuilder;
          method: TMethod;
          input: RequestBuilderMethodInputOutput<TBuilder, TMethod>["input"];
        },
      ) =>
        EntraId.AuthProvider.use((authProvider) =>
          Effect.tryPromise({
            try: () => authProvider.accessTokenProvider.getAuthorizationToken().then(Redacted.make),
            catch: (cause) => new EntraId.AuthProviderError({ cause }),
          }),
        ).pipe(
          Effect.flatMap((accessToken) => clientCache.pipe(Cache.get(accessToken))),
          Effect.map(getArgs),
          Effect.flatMap((args) => Effect.request(new GraphRequest(args), resolver)),
        ),
    );

    const { href: baseScimUrl } = yield* ScimLocator.use(Struct.get("root"));

    const oauth2TokenExchangeUri = yield* SstResource.useSync(Struct.get("Hostnames")).pipe(
      Effect.map(Redacted.value),
      Effect.map((hostnames) => `https://${hostnames.auth}/token`),
    );

    const me = batchRequest((client) => ({
      builder: client.me,
      method: "get",
      input: Tuple.make(),
    })).pipe(Effect.withSpan("Graph.me"));

    const groups = batchRequest((client) => ({
      builder: client.groups,
      method: "get",
      input: Tuple.make(),
    })).pipe(
      Effect.map(Struct.get("value")),
      Effect.filterOrFail(Predicate.isNotNullish),
      Effect.withSpan("Graph.groups"),
    );

    const groupMembers = Effect.fn("Graph.groupMembers")(
      (id: GroupsContract.ExternalId, transitive: boolean = true) =>
        batchRequest((client) => ({
          builder: client.groups.byGroupId(id)[transitive ? "transitiveMembers" : "members"],
          method: "get",
          input: Tuple.make(),
        })).pipe(Effect.map(Struct.get("value")), Effect.filterOrFail(Predicate.isNotNullish)),
    );

    const users = batchRequest((client) => ({
      builder: client.users,
      method: "get",
      input: Tuple.make(),
    })).pipe(
      Effect.map(Struct.get("value")),
      Effect.filterOrFail(Predicate.isNotNullish),
      Effect.withSpan("Graph.users"),
    );

    const user = Effect.fn("Graph.user")((id: UsersContract.ExternalId) =>
      batchRequest((client) => ({
        builder: client.users.byUserId(id),
        method: "get",
        input: Tuple.make(),
      })),
    );

    const userPhoto = Effect.fn("Graph.userPhoto")((id: UsersContract.ExternalId) =>
      batchRequest((client) => ({
        builder: client.users.byUserId(id).photo.content,
        method: "get",
        input: Tuple.make(),
      })),
    );

    const createProvisioningJob = Effect.fn("Graph.createProvisioningJob")(
      (servicePrincipalId: string) =>
        batchRequest((client) => ({
          builder:
            client.servicePrincipals.byServicePrincipalId(servicePrincipalId).synchronization.jobs,
          method: "post",
          input: Tuple.make({
            // TODO
          }),
        })),
    );

    const validateProvisioningClientCredentials = Effect.fn(
      "Graph.validateProvisioningClientCredentials",
    )((servicePrincipalId: string, credentials: OauthContract.ClientCredentials) =>
      batchRequest((client) => ({
        builder:
          client.servicePrincipals.byServicePrincipalId(servicePrincipalId).synchronization.jobs
            .validateCredentials,
        method: "post",
        input: Tuple.make({
          useSavedCredentials: false,
          credentials: Tuple.make(
            { key: "BaseAddress", value: baseScimUrl },
            { key: "Oauth2TokenExchangeUri", value: oauth2TokenExchangeUri },
            { key: "Oauth2ClientId", value: credentials.id },
            { key: "Oauth2ClientSecret", value: credentials.secret.pipe(Redacted.value) },
          ),
        }),
      })),
    );

    return {
      me,
      groups,
      groupMembers,
      users,
      user,
      userPhoto,
      createProvisioningJob,
      validateProvisioningClientCredentials,
    } as const;
  }),
}) {
  public static readonly layer = this.make.pipe(Layer.effect(this));
}
