import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";

import { router } from "~/api/trpc/routers";

export default new Hono().use(
  "/*",
  trpcServer({
    router,
    createContext: (_, c) => ({ req: c.req, res: c.res }),
    onError: ({ error }) => console.error(error),
    responseMeta({ info, errors, type }) {
      const isPublic =
        info?.calls.every((call) => call.path.includes(".public.")) ?? false;
      const isOk = errors.length === 0;
      const isQuery = type === "query";

      if (!isPublic || !isOk || !isQuery) return {};

      // auth.public.getOauthProviderKinds
      // realtime.public.getUrl
      // realtime.public.getAuthorization
      // tenants.public.isSubdomainAvailable
      // tenants.public.isLicenseKeyAvailable

      // if (
      //   info?.calls.every(
      //     (call) => call.path === "auth.public.getOauthProviderKinds",
      //   )
      // ) {
      //   return {
      //     headers: new Headers([["Cache-Control", "max-age=3600"]]),
      //   };
      // }

      return {
        headers: new Headers([
          // TODO
        ]),
      };
    },
  }),
);
