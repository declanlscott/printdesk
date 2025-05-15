import { RouterProvider } from "react-aria-components";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { tenantSubdomainSchema } from "@printdesk/core/tenants/shared";
import {
  createRootRouteWithContext,
  HeadContent,
  notFound,
  Outlet,
  retainSearchParams,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import * as v from "valibot";

import type { InitialRouterContext } from "~/types";

export const Route = createRootRouteWithContext<InitialRouterContext>()({
  validateSearch: v.object({ subdomain: v.optional(tenantSubdomainSchema) }),
  search: { middlewares: [retainSearchParams(["subdomain"])] },
  beforeLoad: async ({ context, search }) => {
    const subdomain =
      context.resource.AppData.isDevMode ||
      !context.resource.AppData.isProdStage
        ? search.subdomain
        : window.location.hostname
            .split(`.${context.resource.Domains.root}`)
            .at(0);
    if (!subdomain) throw new Error("Missing subdomain");

    return { subdomain };
  },
  head: () => ({
    meta: [{ title: "Printdesk" }],
    links: [{ rel: "icon", href: "/favicon.svg" }],
  }),
  component: RouteComponent,
  onError: (error) => {
    if (error instanceof SharedErrors.NotFound) throw notFound();

    throw error;
  },
});

function RouteComponent() {
  const { navigate, buildLocation } = useRouter();

  return (
    <RouterProvider
      navigate={(to, options) => navigate({ ...to, ...options })}
      useHref={(to) => buildLocation(to || {}).href}
    >
      <HeadContent />

      <Outlet />

      <TanStackRouterDevtools position="bottom-right" />
    </RouterProvider>
  );
}
