import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";

import type { ClientOptions } from "@microsoft/microsoft-graph-client";
import type { Group, User } from "@microsoft/microsoft-graph-types";

export namespace Graph {
  export class GraphError extends Data.TaggedError("GraphError")<{
    readonly cause: unknown;
  }> {}

  export class Graph extends Effect.Service<Graph>()(
    "@printdesk/core/graph/Graph",
    {
      accessors: true,
      effect: (opts: ClientOptions) =>
        Effect.gen(function* () {
          const client = yield* Effect.try({
            try: () => Client.initWithMiddleware(opts),
            catch: (cause) => new GraphError({ cause }),
          });

          const me = Effect.tryPromise<User, GraphError>({
            try: () => client.api("/me").responseType(ResponseType.JSON).get(),
            catch: (cause) => new GraphError({ cause }),
          });

          const groups = Effect.tryPromise<Array<Group>, GraphError>({
            try: () =>
              client.api("/groups").responseType(ResponseType.JSON).get(),
            catch: (cause) => new GraphError({ cause }),
          });

          const users = (groupId: string, transitive = true) =>
            Effect.tryPromise<Array<User>, GraphError>({
              try: () =>
                client
                  .api(
                    `/groups/${groupId}/${transitive ? "transitiveMembers" : "members"}/microsoft.graph.user`,
                  )
                  .responseType(ResponseType.JSON)
                  .get(),
              catch: (cause) => new GraphError({ cause }),
            });

          const user = (id: string) =>
            Effect.tryPromise<User, GraphError>({
              try: () =>
                client
                  .api(`/users/${id}`)
                  .responseType(ResponseType.JSON)
                  .get(),
              catch: (cause) => new GraphError({ cause }),
            });

          const userPhotoBlob = (id: string) =>
            Effect.tryPromise<Blob, GraphError>({
              try: () =>
                client
                  .api(`/users/${id}/photo/$value`)
                  .responseType(ResponseType.BLOB)
                  .get(),
              catch: (cause) => new GraphError({ cause }),
            });

          return { me, groups, users, user, userPhotoBlob } as const;
        }),
    },
  ) {}
}
