import { AsyncLocalStorage } from "node:async_hooks";

import * as R from "remeda";

import { ServerErrors } from "../errors";
import { Constants } from "./constants";

export namespace Utils {
  export function createContext<TContext extends object>(name: string) {
    const storage = new AsyncLocalStorage<TContext>();

    function useContext() {
      const context = storage.getStore();
      if (!context) throw new ServerErrors.MissingContext(name);

      return context;
    }

    async function withContext<
      TGetContext extends () => TContext | Promise<TContext>,
      TCallback extends () => ReturnType<TCallback>,
    >(getContext: TGetContext, callback: TCallback, opts = { merge: false }) {
      let context: TContext | undefined;
      try {
        context = useContext();
      } catch (e) {
        if (!isMissing(e)) throw e;
      }

      if (context) {
        if (!opts.merge) return storage.run(context, callback);

        return storage.run(
          R.mergeDeep(context, await Promise.resolve(getContext())) as TContext,
          callback,
        );
      }

      return storage.run(await Promise.resolve(getContext()), callback);
    }

    const isMissing = <TError>(error: TError) =>
      error instanceof ServerErrors.MissingContext &&
      error.contextName === name;

    return { use: useContext, with: withContext, isMissing };
  }

  export const reverseDns = (domainName: string) =>
    domainName.split(".").reverse().join(".");

  export const buildName = (nameTemplate: string, tenantId: string) =>
    nameTemplate.replace(
      new RegExp(Constants.TENANT_ID_PLACEHOLDER, "g"),
      tenantId,
    );
}
