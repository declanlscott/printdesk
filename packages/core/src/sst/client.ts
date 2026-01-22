import * as Redacted from "effect/Redacted";

import { Constants } from "../utils/constants";

import type { Resource } from "sst";

export namespace Sst {
  type ViteResourceKey<TKey extends string> =
    TKey extends `${typeof Constants.VITE_RESOURCE_PREFIX}${infer TResourceKey}`
      ? TResourceKey
      : never;

  export type ViteResource<TImportMetaEnv extends ImportMetaEnv> = {
    readonly [TKey in keyof TImportMetaEnv as ViteResourceKey<
      TKey & string
    >]: ViteResourceKey<TKey & string> extends keyof Resource
      ? Redacted.Redacted<
          Omit<Resource[ViteResourceKey<TKey & string>], "type">
        >
      : never;
  };

  export const makeViteResource = <TImportMetaEnv extends ImportMetaEnv>(
    importMetaEnv = import.meta.env as TImportMetaEnv,
  ) => {
    const raw: Record<string, unknown> = {};
    for (const key in importMetaEnv) {
      const value = importMetaEnv[key];

      if (key.startsWith(Constants.VITE_RESOURCE_PREFIX) && value)
        raw[key.slice(Constants.VITE_RESOURCE_PREFIX.length)] =
          JSON.parse(value);
    }

    return new Proxy(raw, {
      get(target, key: string) {
        if (key in target) return Redacted.make(target[key]);

        throw new Error(`Resource "${key}" is not linked.`);
      },
      getOwnPropertyDescriptor: () => ({
        configurable: true,
        enumerable: true,
      }),
      ownKeys: () => Object.keys(raw),
    }) as ViteResource<TImportMetaEnv>;
  };
}
