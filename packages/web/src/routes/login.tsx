import { createFileRoute, redirect } from "@tanstack/react-router";
import * as R from "remeda";
import * as v from "valibot";

export const Route = createFileRoute("/login")({
  validateSearch: v.object({ from: v.optional(v.string()) }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const oauthProviderKinds =
      await context.trpcClient.auth.public.getOauthProviderKinds.query(
        { subdomain: context.subdomain },
        { context: { skipBatch: true } },
      );
    if (R.isEmpty(oauthProviderKinds)) throw redirect({ to: "/setup" });

    // Start the OAuth flow
    const href = await context.authStoreApi
      .getState()
      .actions.authorize(
        context.subdomain,
        oauthProviderKinds[0],
        deps.search.from,
      );

    throw redirect({ href });
  },
  head: () => ({ meta: [{ title: "Login | Printdesk" }] }),
});

// TODO: If there are multiple oauth providers, render a component that allows the user to choose

// TODO: Error component
