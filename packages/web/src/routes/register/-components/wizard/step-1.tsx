import { registrationWizardStep1Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { ArrowRight } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";
import * as v from "valibot";

import { useApi } from "~/lib/hooks/api";
import { useRegistrationMachine } from "~/lib/hooks/registration";
import { useResource } from "~/lib/hooks/resource";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Link } from "~/ui/primitives/link";
import { Input } from "~/ui/primitives/text-field";

export function RegistrationWizardStep1() {
  const registrationMachine = useRegistrationMachine();

  const actorRef = registrationMachine.useActorRef();

  const defaultValues = registrationMachine.useSelector(({ context }) => ({
    licenseKey: context.licenseKey,
    tenantName: context.tenantName,
    tenantSlug: context.tenantSlug,
  }));

  const api = useApi();

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
      if (!isAvailable) return toast.error("License key is not available.");

      actorRef.send({ type: "wizard.step1.next", ...value });
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

                {R.isEmpty(field.state.meta.errors) ? null : (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                )}
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

                {R.isEmpty(field.state.meta.errors) ? null : (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>

          <div className="grid gap-2">
            <Label>Slug</Label>

            <CardDescription>
              A unique identifier for your organization, used for accessing the
              application:
              <Link href={{ to: "/" }} target="_blank">
                {defaultValues.tenantSlug.toLowerCase()}.
                {AppData.domainName.fullyQualified}
              </Link>
            </CardDescription>

            <Input value={defaultValues.tenantSlug} disabled />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <form.Subscribe
          selector={({ canSubmit, isSubmitting }) => ({
            canSubmit,
            isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              className="gap-2"
              isDisabled={!canSubmit}
              isLoading={isSubmitting}
            >
              Next
              <ArrowRight className="size-5" />
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
