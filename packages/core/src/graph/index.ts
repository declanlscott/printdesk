import {
  Client as GraphClient,
  ResponseType,
} from "@microsoft/microsoft-graph-client";

import { useGraph } from "./context";

import type { User } from "@microsoft/microsoft-graph-types";

export namespace Graph {
  export const Client = GraphClient;
  export type Client = GraphClient;

  export const me = async () => useGraph().api("/me").get() as Promise<User>;

  export const users = async () =>
    useGraph().api("/users").responseType(ResponseType.JSON).get() as Promise<
      Array<User>
    >;

  export const user = async (idOrEmail: string) =>
    useGraph()
      .api(`/users/${idOrEmail}`)
      .responseType(ResponseType.JSON)
      .get() as Promise<User>;

  export const userPhotoBlob = async (id: string) =>
    useGraph()
      .api(`/users/${id}/photo/$value`)
      .responseType(ResponseType.BLOB)
      .get() as Promise<Blob>;
}
