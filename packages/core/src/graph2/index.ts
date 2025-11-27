import {
  Client as Client_,
  ResponseType,
} from "@microsoft/microsoft-graph-client";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";

import type { ClientOptions } from "@microsoft/microsoft-graph-client";
import type { Group, User } from "@microsoft/microsoft-graph-types";
import type { GroupsContract } from "../groups2/contract";
import type { UsersContract } from "../users2/contract";

export namespace Graph {
  export class ClientError extends Data.TaggedError("ClientError")<{
    readonly cause: unknown;
  }> {}

  export class Client extends Effect.Service<Client>()(
    "@printdesk/core/graph/Client",
    {
      accessors: true,
      effect: (opts: ClientOptions) =>
        Effect.gen(function* () {
          const client = yield* Effect.try({
            try: () => Client_.initWithMiddleware(opts),
            catch: (cause) => new ClientError({ cause }),
          });

          const me = Effect.tryPromise<User, ClientError>({
            try: () => client.api("/me").responseType(ResponseType.JSON).get(),
            catch: (cause) => new ClientError({ cause }),
          });

          const groups = Effect.tryPromise<Array<Group>, ClientError>({
            try: () =>
              client.api("/groups").responseType(ResponseType.JSON).get(),
            catch: (cause) => new ClientError({ cause }),
          });

          const users = (
            groupId: GroupsContract.DataTransferObject["externalId"],
            transitive = true,
          ) =>
            Effect.tryPromise<Array<User>, ClientError>({
              try: () =>
                client
                  .api(
                    `/groups/${groupId}/${transitive ? "transitiveMembers" : "members"}/microsoft.graph.user`,
                  )
                  .responseType(ResponseType.JSON)
                  .get(),
              catch: (cause) => new ClientError({ cause }),
            });

          const user = (id: UsersContract.DataTransferObject["externalId"]) =>
            Effect.tryPromise<User, ClientError>({
              try: () =>
                client
                  .api(`/users/${id}`)
                  .responseType(ResponseType.JSON)
                  .get(),
              catch: (cause) => new ClientError({ cause }),
            });

          const userPhotoBlob = (
            id: UsersContract.DataTransferObject["externalId"],
          ) =>
            Effect.tryPromise<Blob, ClientError>({
              try: () =>
                client
                  .api(`/users/${id}/photo/$value`)
                  .responseType(ResponseType.BLOB)
                  .get(),
              catch: (cause) => new ClientError({ cause }),
            });

          return { me, groups, users, user, userPhotoBlob } as const;
        }),
    },
  ) {}
}
