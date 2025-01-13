import { composeRenderProps, Link } from "react-aria-components";
import { registrationStep1Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import * as v from "valibot";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useApi } from "~/lib/hooks/api";
import { useResource } from "~/lib/hooks/resource";
import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { buttonStyles } from "~/styles/components/primitives/button";
import { Button } from "~/ui/primitives/button";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export const Route = createFileRoute("/register/_wizard/1")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const api = useApi();

  const { submit } = RegistrationWizardStoreApi.useActions();

  const defaultValues = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow(({ licenseKey, tenantName }) => ({
      licenseKey,
      tenantName,
    })),
  );

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onBlur: v.omit(registrationStep1Schema, ["tenantSlug"]),
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      const res = await api.client.public.tenants["license-key-availability"][
        ":value"
      ].$get({
        param: { value: value.licenseKey },
      });
      if (!res.ok)
        switch (res.status as number) {
          case 429:
            return toast.error("Too many requests, try again later.");
          default:
            return toast.error("An unexpected error occurred.");
        }

      const { isAvailable } = await res.json();
      if (!isAvailable) return toast.error("License key is not available");

      submit({ step: 1, ...value });

      await navigate({ to: "/register/2", search: { slug } });
    },
  });

  const { AppData } = useResource();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <div className="grid gap-4">
        <form.Field name="licenseKey">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>License Key</Label>

              <p className="text-muted-foreground text-sm">
                The license key provided by your administrator.
              </p>

              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              />

              <span className="text-sm text-red-500">
                {field.state.meta.errors.join(", ")}
              </span>
            </div>
          )}
        </form.Field>

        <form.Field name="tenantName">
          {(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Name</Label>

              <p className="text-muted-foreground text-sm">
                The full name of your organization.
              </p>

              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Acme Inc."
              />

              <span className="text-sm text-red-500">
                {field.state.meta.errors.join(", ")}
              </span>
            </div>
          )}
        </form.Field>

        <div className="grid gap-2">
          <Label>Slug</Label>

          <p className="text-muted-foreground text-sm">
            A unique identifier for your organization, used for accessing the
            application:
            <Link
              href={{ to: "/" }}
              className={composeRenderProps(
                "text-muted-foreground h-fit p-0",
                (className, renderProps) =>
                  buttonStyles({
                    ...renderProps,
                    variant: "link",
                    className,
                  }),
              )}
            >
              {slug.toLowerCase()}.{AppData.domainName.fullyQualified}
            </Link>
          </p>

          <Input value={slug} disabled />
        </div>

        <div className="flex justify-end">
          <form.Subscribe selector={({ canSubmit }) => canSubmit}>
            {(canSubmit) => (
              <Button type="submit" className="gap-2" isDisabled={!canSubmit}>
                Next
                <ArrowRight className="size-5" />
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
}
