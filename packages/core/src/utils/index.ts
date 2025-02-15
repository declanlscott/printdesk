/**
 * NOTE: This module provides server utility functions and must remain framework-agnostic.
 * For example it should not depend on sst for linked resources. Other modules in the
 * core package may depend on sst, but this module should not.
 */

import { AsyncLocalStorage } from "node:async_hooks";

import { ApplicationError } from "./errors";

export namespace Utils {
  export function createContext<TContext>(name: string) {
    const storage = new AsyncLocalStorage<TContext>();

    return {
      use: () => {
        const context = storage.getStore();
        if (!context) throw new ApplicationError.MissingContext(name);

        return context;
      },
      with: <TCallback extends () => ReturnType<TCallback>>(
        context: TContext,
        callback: TCallback,
      ) => storage.run(context, callback),
    };
  }

  export const reverseDns = (domainName: string) =>
    domainName.split(".").reverse().join(".");

  export const buildName = (nameTemplate: string, tenantId: string) =>
    nameTemplate.replace(/{{tenant_id}}/g, tenantId);
}
