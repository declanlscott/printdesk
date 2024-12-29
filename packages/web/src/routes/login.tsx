import { createFileRoute, redirect } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/text-field";
import { useSlot } from "~/app/lib/hooks/slot";
import {
  initialLoginSearchParams,
  loginSearchParamsSchema,
} from "~/app/lib/schemas";
import { buttonStyles } from "~/styles/components/primitives/button";

export const Route = createFileRoute("/login")({
  validateSearch: (search) =>
    v.parse(
      v.fallback(loginSearchParamsSchema, initialLoginSearchParams),
      search,
    ),
  beforeLoad: ({ context }) => {
    if (context.actor.type === "user") throw redirect({ to: "/dashboard" });
  },
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const isValid = v.safeParse(loginSearchParamsSchema, search).success;

  const navigate = Route.useNavigate();

  const { logo } = useSlot();

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div
        className="bg-muted hidden lg:block lg:max-h-screen"
        style={{
          backgroundImage: "url(/topography.svg)",
          backgroundRepeat: "repeat",
        }}
      />

      <form
        action="/api/auth/login"
        method="GET"
        className="flex items-center justify-center py-12"
      >
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="flex justify-center">
            <a href="/">
              <div className="flex h-24 w-20 items-center overflow-hidden">
                {logo}
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
                value={search.tenant}
                onChange={(e) =>
                  navigate({
                    search: {
                      ...search,
                      tenant: e.target.value,
                    },
                  })
                }
                required
              />

              {search.redirect && (
                <input type="hidden" name="redirect" value={search.redirect} />
              )}
            </div>

            <Button
              className="w-full gap-2"
              type="submit"
              isDisabled={!isValid}
            >
              <LogIn className="size-5" />
              Continue
            </Button>
          </div>

          <p className="text-sm">
            Don&apos;t have an organization?{" "}
            <a
              href="/register"
              className={buttonStyles({
                variant: "link",
                isHtml: true,
                className: "h-fit p-0",
              })}
            >
              Register
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
