import { Utils } from "../utils";

import type { Client as GraphClient } from "@microsoft/microsoft-graph-client";

export type GraphContext = GraphClient;
export const GraphContext = Utils.createContext<GraphContext>("Graph");

export const useGraph = GraphContext.use;
export const withGraph = GraphContext.with;
