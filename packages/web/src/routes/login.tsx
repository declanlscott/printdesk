import { createFileRoute, redirect } from "@tanstack/react-router";
import * as R from "remeda";
import * as v from "valibot";

export const Route = createFileRoute("/login")({
  validateSearch: v.object({ from: v.optional(v.string()) }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const oauthProviderKinds =
      await context.trpcClient.auth.getOauthProviderKinds.query({
        slug: context.slug,
      });
    if (R.isEmpty(oauthProviderKinds)) throw redirect({ to: "/setup" });

    // Start the OAuth flow
    const url = await context.authStoreApi
      .getState()
      .actions.authorize(context.slug, oauthProviderKinds[0], deps.search.from);

    throw redirect({ href: url, reloadDocument: true });
  },
});

// TODO: If there are multiple oauth providers, render a component that allows the user to choose

// TODO: Error component
