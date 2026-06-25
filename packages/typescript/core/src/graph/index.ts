import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";

import { Constants } from "../utils/constants";

import type { ClientOptions, GraphRequest } from "@microsoft/microsoft-graph-client";
import type { Group, User } from "@microsoft/microsoft-graph-types";
import type { CustomerGroupsContract } from "../groups/contracts";
import type { UsersContract } from "../users/contract";

export class GraphGetRequest<TSuccess = unknown> extends Request.Class<
  GraphRequest,
  TSuccess,
  GraphError
> {}

export class GraphError extends Schema.TaggedErrorClass<GraphError>()("GraphError", {
  cause: Schema.Defect(),
}) {}

export class Graph extends Context.Service<Graph>()("@printdesk/core/graph/Graph", {
  make: Effect.fn(function* (opts: ClientOptions) {
    const client = yield* Effect.try({
      try: () => Client.initWithMiddleware(opts),
      catch: (cause) => new GraphError({ cause }),
    });

    const getResolver = RequestResolver.make<GraphGetRequest>(
      Effect.forEach((entry) =>
        Effect.tryPromise({
          try: (signal) => entry.request.option("signal", signal).get(),
          catch: (cause) => new GraphError({ cause }),
        }).pipe(Effect.exit, Effect.map(entry.completeUnsafe)),
      ),
    ).pipe(
      RequestResolver.setDelay(Constants.GRAPH_REQUEST_BATCH_DELAY),
      RequestResolver.batchN(Constants.GRAPH_REQUEST_BATCH_SIZE),
      RequestResolver.withSpan("Graph.getResolver"),
    );

    const batchGetRequest = Effect.fn("Graph.batchGetRequest")(<TSuccess>(request: GraphRequest) =>
      Effect.request(new GraphGetRequest<TSuccess>(request), getResolver),
    );

    const me = batchGetRequest<User>(client.api("/me").responseType(ResponseType.JSON)).pipe(
      Effect.withSpan("Graph.me"),
    );

    const groups = batchGetRequest<Array<Group>>(
      client.api("/groups").responseType(ResponseType.JSON),
    ).pipe(Effect.withSpan("Graph.groups"));

    const groupMembers = Effect.fn("Graph.groupMembers")(
      (groupId: CustomerGroupsContract.ExternalId, transitive: boolean = true) =>
        batchGetRequest<Array<User>>(
          client
            .api(
              `/groups/${groupId}/${transitive ? "transitiveMembers" : "members"}/microsoft.graph.user`,
            )
            .responseType(ResponseType.JSON),
        ),
    );

    const users = batchGetRequest<Array<User>>(
      client.api("/users").responseType(ResponseType.JSON),
    ).pipe(Effect.withSpan("Graph.users"));

    const user = Effect.fn("Graph.user")((id: UsersContract.ExternalId) =>
      batchGetRequest<User>(client.api(`/users/${id}`).responseType(ResponseType.JSON)),
    );

    const userPhotoBlob = Effect.fn("Graph.userPhotoBlob")((id: UsersContract.ExternalId) =>
      batchGetRequest<Blob>(
        client.api(`/users/${id}/photo/$value`).responseType(ResponseType.BLOB),
      ),
    );

    return {
      me,
      groups,
      groupMembers,
      users,
      user,
      userPhotoBlob,
    } as const;
  }),
}) {
  public static layer(...args: Parameters<typeof Graph.make>) {
    return this.make(...args).pipe(Layer.effect(this));
  }
}
