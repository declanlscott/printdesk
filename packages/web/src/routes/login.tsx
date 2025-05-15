import { createFileRoute, redirect } from "@tanstack/react-router";
import * as R from "remeda";
import * as v from "valibot";

export const Route = createFileRoute("/login")({
  validateSearch: v.object({ from: v.optional(v.string()) }),
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    const identityProviderKinds =
      await context.trpcClient.auth.public.getIdentityProviderKinds.query(
        { subdomain: context.subdomain },
        { context: { skipBatch: true } },
      );
    if (R.isEmpty(identityProviderKinds)) throw redirect({ to: "/setup" });

    // Start the OAuth flow
    const href = await context.authStoreApi
      .getState()
      .actions.authorize(
        context.subdomain,
        identityProviderKinds[0],
        deps.search.from,
      );

    throw redirect({ href });
  },
  head: () => ({ meta: [{ title: "Login | Printdesk" }] }),
});

// TODO: If there are multiple oauth providers, render a component that allows the user to choose

// TODO: Error component
