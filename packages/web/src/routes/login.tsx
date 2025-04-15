import { createFileRoute, redirect } from "@tanstack/react-router";
import * as R from "remeda";
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
    if (!slug) throw new Error("Missing slug");

    const oauthProviderKinds =
      await context.trpcClient.auth.getOauthProviderKinds.query({ slug });
    if (R.isEmpty(oauthProviderKinds))
      throw redirect({ to: "/setup", search: isDev ? { slug } : {} });

    // Start the OAuth flow
    const url = await context.authStoreApi
      .getState()
      .actions.authorize(oauthProviderKinds[0], deps.search.from);

    throw redirect({ href: url, reloadDocument: true });
  },
});

// TODO: If there are multiple oauth providers, render a component that allows the user to choose

// TODO: Error component
