import { Utils } from "@printworks/core/utils";
import { parseResource } from "@printworks/core/utils/shared";

import type { Resource } from "sst";

export const resourcePrefix = "FUNCTION_RESOURCE_";

export type FunctionResource = {
  [TKey in keyof Pick<
    Resource,
    | "ApiFunction"
    | "AppData"
    | "Aws"
    | "CloudfrontPublicKey"
    | "Code"
    | "InvoicesProcessor"
    | "PapercutSync"
    | "PulumiBucket"
  >]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = FunctionResource;
export const ResourceContext = Utils.createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    parseResource<FunctionResource>(resourcePrefix, process.env),
    callback,
  );
