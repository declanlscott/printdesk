import { tenantsTableName } from "@printworks/core/tenants/shared";
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
    const slug =
      context.resource.AppData.isDev || window.location.hostname === "localhost"
        ? deps.search.slug
        : window.location.hostname
            .split(`.${context.resource.AppData.domainName.fullyQualified}`)
            .at(0);
    if (!slug) throw new ApplicationError.Error("Missing slug");

    const res = await context.api.client.public.tenants[
      "oauth-provider-types"
    ].$get({ query: { slug } });
    if (!res.ok) {
      switch (res.status as number) {
        case 404:
          throw new ApplicationError.EntityNotFound({
            name: tenantsTableName,
            id: slug,
          });
        case 429:
          throw new ApplicationError.Error(
            "Too many requests, try again later.",
          );
        default:
          throw new ApplicationError.Error("An unexpected error occurred.");
      }
    }

    const { oauthProviderTypes } = await res.json();

    // Start the OAuth flow
    const url = await context.authStoreApi
      .getState()
      .actions.authorize(oauthProviderTypes[0], deps.search.from);

    throw redirect({ href: url, reloadDocument: true });
  },
});

// TODO: If there are multiple providers, render a component that allows the user to choose

// TODO: Error component
