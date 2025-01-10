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
      .actions.exchange(deps.code, deps.state);

    if (deps.from) throw redirect({ href: deps.from });

    throw redirect({ to: "/" });
  },
});

// TODO: Error component
