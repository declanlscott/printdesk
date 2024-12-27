import { Utils } from "@printworks/core/utils";
import * as pulumi from "@pulumi/pulumi";

import type { Resource } from "sst";

export const resourcePrefix = "CUSTOM_RESOURCE_";

export type CustomResource = {
  [TKey in keyof Pick<
    Resource,
    | "AppData"
    | "Aws"
    | "CloudfrontPublicKey"
    | "Code"
    | "InvoicesProcessor"
    | "PapercutSync"
    | "PulumiBucket"
    | "Web"
  >]: Omit<Resource[TKey], "type">;
};

export type ResourceContext = CustomResource;
export const ResourceContext = Utils.createContext<ResourceContext>("Resource");

export const useResource = ResourceContext.use;

export const withResource = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  ResourceContext.with(
    Utils.parseResource<CustomResource>(resourcePrefix, process.env),
    callback,
  );

export const link = (...args: Parameters<typeof injectLinkables>) => ({
  environment: {
    variables: injectLinkables(...args),
  },
});

export function injectLinkables(
  linkables: {
    [TKey in keyof Resource]?: pulumi.Input<Record<string, unknown>>;
  },
  prefix = "CUSTOM_RESOURCE",
) {
  const vars: Record<string, pulumi.Output<string>> = {};
  for (const logicalName in linkables) {
    const value = linkables[logicalName as keyof Resource];

    vars[`${prefix}_${logicalName}`] = pulumi.jsonStringify(
      pulumi.output(value),
    );
  }

  return vars;
}
