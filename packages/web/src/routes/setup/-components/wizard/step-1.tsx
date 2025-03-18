import { setupWizardStep1Schema } from "@printworks/core/tenants/shared";
import { ArrowRight } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";

import { useApi } from "~/lib/hooks/api";
import { useAppForm } from "~/lib/hooks/form";
import { useResource } from "~/lib/hooks/resource";
import { useSetupMachine } from "~/lib/hooks/setup";
import { Card, CardContent } from "~/ui/primitives/card";
import { Link } from "~/ui/primitives/link";

export function SetupWizardStep1() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    licenseKey: context.licenseKey,
    tenantName: context.tenantName,
    tenantSlug: context.tenantSlug,
  }));

  const api = useApi();

  const form = useAppForm({
    validators: { onSubmit: setupWizardStep1Schema },
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
          <form.AppField
            name="licenseKey"
            validators={{
              onBlur: setupWizardStep1Schema.entries.licenseKey,
            }}
          >
            {(field) => (
              <field.TextField
                labelProps={{ children: "License Key" }}
                descriptionProps={{
                  children: "Your valid application license key.",
                }}
                inputProps={{
                  placeholder: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
                }}
                errorMessageProps={{
                  children: field.state.meta.errors
                    .filter(Boolean)
                    .map(R.prop("message"))
                    .join(", "),
                }}
                className="grid gap-2"
              />
            )}
          </form.AppField>

          <form.AppField
            name="tenantName"
            validators={{ onBlur: setupWizardStep1Schema.entries.tenantName }}
          >
            {(field) => (
              <field.TextField
                labelProps={{ children: "Name" }}
                descriptionProps={{
                  children: "The full name of your organization.",
                }}
                inputProps={{ placeholder: "Acme Inc." }}
                errorMessageProps={{
                  children: field.state.meta.errors
                    .filter(Boolean)
                    .map(R.prop("message"))
                    .join(", "),
                }}
                className="grid gap-2"
              />
            )}
          </form.AppField>

          <form.AppField name="tenantSlug">
            {(field) => (
              <field.TextField
                labelProps={{ children: "Slug" }}
                descriptionProps={{
                  children: (
                    <>
                      A unique identifier for your organization, used for
                      accessing the application:
                      <Link href={{ to: "/" }} target="_blank">
                        {defaultValues.tenantSlug.toLowerCase()}.
                        {AppData.domainName.fullyQualified}
                      </Link>
                    </>
                  ),
                }}
                inputProps={{ disabled: true }}
                className="grid gap-2"
              />
            )}
          </form.AppField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <form.AppForm>
          <form.SubmitButton>
            Next
            <ArrowRight className="size-5" />
          </form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  );
}
