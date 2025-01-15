import { registrationWizardStep3Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export const Route = createFileRoute("/register/_wizard/3")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const defaultValues = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow((store) => ({
      tailscaleOauthClientId: store.tailscaleOauthClientId,
      tailscaleOauthClientSecret: store.tailscaleOauthClientSecret,
    })),
  );

  const { submit } = RegistrationWizardStoreApi.useActions();

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep3Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      submit({ step: 3, ...value });

      await navigate({ to: "/register/4", search: { slug } });
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // await form.handleSubmit();
        await navigate({ to: "/register/4", search: { slug } });
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">3. Tailscale OAuth Client</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <CardDescription>
            <a
              href="https://tailscale.com/"
              className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
              target="_blank"
            >
              Tailscale
            </a>{" "}
            facilitates the secure network connection between Printworks and
            your PaperCut server. If you haven't already, create an OAuth client
            in the Tailscale{" "}
            <a
              href="https://login.tailscale.com"
              className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
              target="_blank"
            >
              admin console
            </a>
            .
          </CardDescription>

          <CardDescription>
            Tailscale must also be{" "}
            <a
              href="https://tailscale.com/kb/1347/installation"
              className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
            >
              installed
            </a>{" "}
            and enabled on the host of your PaperCut server.
          </CardDescription>

          <CardDescription>
            Printworks encrypts the OAuth client data and it will{" "}
            <strong>not</strong> be visible after completing registration.
          </CardDescription>

          <form.Field
            name="tailscaleOauthClientId"
            validators={{
              onBlur:
                registrationWizardStep3Schema.entries.tailscaleOauthClientId,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Client ID</Label>

                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />

                {field.state.meta.errors.length > 0 ? (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="tailscaleOauthClientId"
            validators={{
              onBlur:
                registrationWizardStep3Schema.entries
                  .tailscaleOauthClientSecret,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Client Secret</Label>

                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />

                {field.state.meta.errors.length > 0 ? (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                ) : null}
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onPress={() => navigate({ to: "/register/2", search: { slug } })}
          className="gap-2"
          variant="secondary"
        >
          <ArrowLeft className="size-5" />
          Back
        </Button>

        <form.Subscribe selector={({ canSubmit }) => canSubmit}>
          {(canSubmit) => (
            <Button type="submit" className="gap-2" isDisabled={!canSubmit}>
              Next <ArrowRight className="size-5" />
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
