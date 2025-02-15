import { ApplicationError } from "@printworks/core/utils/errors";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

export const Route = createFileRoute("/login")({
  validateSearch: v.object({
    slug: v.optional(v.string()),
    from: v.optional(v.string()),
  }),
  loaderDeps: ({ search }) => ({ search }),
  beforeLoad: async ({ context }) => {
    try {
      await context.authStoreApi.getState().actions.verify();
    } catch {
      // Continue loading the login route if the user is unauthenticated
      return;
    }

    // Otherwise, redirect to the dashboard
    throw redirect({ to: "/" });
  },
  loader: async ({ context, deps }) => {
    const isDev =
      context.resource.AppData.isDev ||
      window.location.hostname === "localhost";

    const slug = isDev
      ? deps.search.slug
      : window.location.hostname
          .split(`.${context.resource.AppData.domainName.fullyQualified}`)
          .at(0);
    if (!slug) throw new ApplicationError.Error("Missing slug");

    const res = await context.api.client.public.tenants["oauth-providers"].$get(
      { query: { slug } },
    );
    if (!res.ok) {
      switch (res.status as number) {
        case 404:
          throw redirect({ to: "/register", search: isDev ? { slug } : {} });
        case 429:
          throw new ApplicationError.Error(
            "Too many requests, try again later.",
          );
        default:
          throw new ApplicationError.Error("An unexpected error occurred.");
      }
    }

    const { providers } = await res.json();

    // Start the OAuth flow
    const url = await context.authStoreApi
      .getState()
      .actions.authorize(providers[0], deps.search.from);

    throw redirect({ href: url, reloadDocument: true });
  },
});

// TODO: If there are multiple providers, render a component that allows the user to choose

// TODO: Error component
