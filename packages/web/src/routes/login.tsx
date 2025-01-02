import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, LogIn } from "lucide-react";
import * as v from "valibot";

import logo from "~/assets/logo.svg";
import topography from "~/assets/topography.svg";
import { Alert, AlertDescription, AlertTitle } from "~/ui/primitives/alert";
import { Button } from "~/ui/primitives/button";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

type LoaderData = { state: "empty" } | { state: "error"; message: string };

export const Route = createFileRoute("/login")({
  validateSearch: v.object({
    org: v.optional(v.string()),
    from: v.optional(v.string()),
  }),
  loaderDeps: ({ search: { org, from } }) => ({ org, from }),
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
  loader: async ({ context, deps }): Promise<LoaderData> => {
    if (!deps.org) return { state: "empty" };

    const res = await context.api.client.tenants["oauth-provider-type"].$get({
      query: { slug: deps.org },
    });
    if (!res.ok)
      switch (res.status as number) {
        case 404:
          return {
            state: "error",
            message: `No organization matching "${deps.org}" was found.`,
          };
        case 429:
          return {
            state: "error",
            message: "Too many requests, try again later.",
          };
        default:
          return {
            state: "error",
            message: "An unexpected error occurred.",
          };
      }

    const { oauthProviderType } = await res.json();

    const url = await context.authStore.actions.authorize(
      oauthProviderType,
      deps.from,
    );

    // Start the OAuth flow
    throw redirect({ href: url, reloadDocument: true });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const data = Route.useLoaderData();

  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { org: search.org ?? "" },
    onSubmit: async ({ value }) =>
      navigate({ to: "/login", search: { ...search, ...value } }),
  });

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div
        className="bg-muted hidden lg:block lg:max-h-screen"
        style={{
          backgroundImage: `url(${topography})`,
          backgroundRepeat: "repeat",
        }}
      />

      <form
        className="flex items-center justify-center py-12"
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="flex justify-center">
            <a href="/">
              <div className="flex h-24 w-20 items-center overflow-hidden">
                <img src={logo} alt="Printworks" />
              </div>
            </a>
          </div>

          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-muted-foreground text-balance">
              Enter your organization below to login to your account.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="org">Organization</Label>

              <Input
                id="org"
                name="tenant"
                value={search.org}
                onChange={(e) =>
                  navigate({
                    to: "/login",
                    search: {
                      ...search,
                      org: e.target.value,
                    },
                  })
                }
                required
              />

              {data.state === "error" ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />

                  <AlertTitle>Error</AlertTitle>

                  <AlertDescription>{data.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <Button className="w-full gap-2" type="submit">
              <LogIn className="size-5" />
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
