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
      await context.authStore.actions.verify();
    } catch {
      // Continue loading the login route if the user is unauthenticated
      return;
    }

    // Otherwise, redirect to the dashboard
    throw redirect({ to: "/" });
  },
  loader: async ({ context, deps }) => {
    let slug: string;
    if (
      context.resource.AppData.isDev ||
      window.location.hostname === "localhost"
    ) {
      if (!deps.search.slug) throw new ApplicationError.Error("Missing slug");

      slug = deps.search.slug;
    } else {
      slug = window.location.hostname.split(
        `.${context.resource.AppData.domainName.fullyQualified}`,
      )[0];
    }

    const res = await context.api.client.tenants["oauth-provider-type"].$get({
      query: { slug },
    });
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

    const { oauthProviderType } = await res.json();

    // Start the OAuth flow
    const url = await context.authStore.actions.authorize(
      oauthProviderType,
      deps.search.from,
    );

    throw redirect({ href: url, reloadDocument: true });
  },
});

// TODO: Error component
