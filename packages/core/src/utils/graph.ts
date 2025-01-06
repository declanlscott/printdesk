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

import type { User } from "@microsoft/microsoft-graph-types";

export type GraphContext = GraphClient;
export const GraphContext = Utils.createContext<GraphContext>("Graph");

export const useGraph = GraphContext.use;
export const withGraph = GraphContext.with;

export namespace Graph {
  export const Client = GraphClient;
  export type Client = GraphClient;

  export const me = async (): Promise<User> => useGraph().api("/me").get();

  export const photoResponse = async (userId: string): Promise<Response> =>
    useGraph()
      .api(`/users/${userId}/photo/$value`)
      .responseType(ResponseType.RAW)
      .get();
}
