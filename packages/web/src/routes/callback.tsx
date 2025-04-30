import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

export const Route = createFileRoute("/callback")({
  validateSearch: v.object({
    code: v.string(),
    state: v.string(),
    from: v.optional(v.string()),
  }),
  loaderDeps: ({ search: { code, state, from } }) => ({ code, state, from }),
  loader: async ({ context, deps }) => {
    await context.authStoreApi
      .getState()
      .actions.exchange(context.subdomain, deps.code, deps.state);

    if (deps.from) throw redirect({ href: deps.from });

    throw redirect({
      to: "/",
      search:
        context.resource.AppData.isDev ||
        window.location.hostname === "localhost"
          ? { subdomain: context.subdomain }
          : {},
    });
  },
  head: () => ({ meta: [{ title: "Login | Printdesk" }] }),
});

// TODO: Error component
