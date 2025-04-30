import { RouterProvider } from "react-aria-components";
import { SharedErrors } from "@printdesk/core/errors/shared";
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
  validateSearch: v.object({ slug: v.optional(v.string()) }),
  search: { middlewares: [retainSearchParams(["slug"])] },
  beforeLoad: async ({ context, search }) => {
    const slug =
      context.resource.AppData.isDev || window.location.hostname === "localhost"
        ? search.slug
        : window.location.hostname
            .split(`.${context.resource.AppData.domainName.fullyQualified}`)
            .at(0);
    if (!slug) throw new Error("Missing slug");

    return { slug };
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
