import { registrationWizardStep1Schema } from "@printworks/core/tenants/shared";
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
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Link } from "~/ui/primitives/link";
import { Input } from "~/ui/primitives/text-field";

export const Route = createFileRoute("/register/_wizard/1")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const defaultValues = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow(({ licenseKey, tenantName }) => ({
      licenseKey,
      tenantName,
    })),
  );

  const api = useApi();

  const { submit } = RegistrationWizardStoreApi.useActions();

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onSubmit: v.omit(registrationWizardStep1Schema, ["tenantSlug"]),
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
        await navigate({ to: "/register/2", search: { slug } });
        // await form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">1. Basic Information</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <form.Field
            name="licenseKey"
            validators={{
              onBlur: registrationWizardStep1Schema.entries.licenseKey,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>License Key</Label>

                <CardDescription>
                  Your valid application license key.
                </CardDescription>

                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
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
            name="tenantName"
            validators={{
              onBlur: registrationWizardStep1Schema.entries.tenantName,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Name</Label>

                <CardDescription>
                  The full name of your organization.
                </CardDescription>

                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Acme Inc."
                />

                {field.state.meta.errors.length > 0 ? (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                ) : null}
              </div>
            )}
          </form.Field>

          <div className="grid gap-2">
            <Label>Slug</Label>

            <CardDescription>
              A unique identifier for your organization, used for accessing the
              application:
              <Link href={{ to: "/" }} target="_blank">
                {slug.toLowerCase()}.{AppData.domainName.fullyQualified}
              </Link>
            </CardDescription>

            <Input value={slug} disabled />
          </div>
        </CardContent>
      </Card>

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
    </form>
  );
}
