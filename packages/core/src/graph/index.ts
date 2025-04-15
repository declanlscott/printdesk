import {
  Client as GraphClient,
  ResponseType,
} from "@microsoft/microsoft-graph-client";

import { useGraph } from "./context";

import type { Group, User } from "@microsoft/microsoft-graph-types";

export namespace Graph {
  export const Client = GraphClient;
  export type Client = GraphClient;

  export const me = async () => useGraph().api("/me").get() as Promise<User>;

  export const groups = async () =>
    useGraph().api("/groups").responseType(ResponseType.JSON).get() as Promise<
      Array<Group>
    >;

  export const users = async (groupId: string, transitive = true) =>
    useGraph()
      .api(
        `/groups/${groupId}/${transitive ? "transitiveMembers" : "members"}/microsoft.graph.user`,
      )
      .responseType(ResponseType.JSON)
      .get() as Promise<Array<User>>;

  export const user = async (userId: string) =>
    useGraph()
      .api(`/users/${userId}`)
      .responseType(ResponseType.JSON)
      .get() as Promise<User>;

  export const userPhotoBlob = async (userId: string) =>
    useGraph()
      .api(`/users/${userId}/photo/$value`)
      .responseType(ResponseType.BLOB)
      .get() as Promise<Blob>;
}
