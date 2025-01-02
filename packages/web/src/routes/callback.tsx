import { createFileRoute, redirect } from "@tanstack/react-router";
import * as v from "valibot";

import type { ErrorComponentProps } from "@tanstack/react-router";

export const Route = createFileRoute("/callback")({
  validateSearch: v.object({
    code: v.string(),
    state: v.string(),
    from: v.optional(v.string()),
  }),
  loaderDeps: ({ search: { code, state, from } }) => ({ code, state, from }),
  loader: async ({ context, deps }) => {
    await context.authStore.actions.exchange(deps.code, deps.state);

    if (deps.from) throw redirect({ href: deps.from });

    throw redirect({ to: "/" });
  },
  component: ErrorComponent,
});

// TODO: Better error component
function ErrorComponent(props: ErrorComponentProps) {
  return <div>{props.error.message}</div>;
}
