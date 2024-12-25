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

  export function parseResource<TResource extends Record<string, unknown>>(
    prefix: string,
    input: Record<string, string | undefined>,
  ): TResource {
    const raw: Record<string, unknown> = {};
    for (const key in input) {
      const value = input[key];

      if (key.startsWith(prefix) && value)
        raw[key.slice(prefix.length)] = JSON.parse(value);
    }

    return new Proxy(raw, {
      get(target, prop: string) {
        if (prop in target) return target[prop];

        throw new Error(`Resource "${prop}" is not linked.`);
      },
    }) as TResource;
  }

  export const reverseDns = (domainName: string) =>
    domainName.split(".").reverse().join(".");
}
