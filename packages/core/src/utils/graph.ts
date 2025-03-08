/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import {
  Client as GraphClient,
  ResponseType,
} from "@microsoft/microsoft-graph-client";

import { Utils } from ".";
import { Constants } from "./constants";

import type { User } from "@microsoft/microsoft-graph-types";

export type GraphContext = GraphClient;
export const GraphContext = Utils.createContext<GraphContext>(
  Constants.CONTEXT_NAMES.GRAPH,
);

export const useGraph = GraphContext.use;
export const withGraph = GraphContext.with;

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

  export const userPhotoResponse = async (id: string) =>
    useGraph()
      .api(`/users/${id}/photo/$value`)
      .responseType(ResponseType.RAW)
      .get() as Promise<Response>;
}
