import { registrationWizardSchema } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import * as v from "valibot";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { labelStyles } from "~/styles/components/primitives/field";
import { inputStyles } from "~/styles/components/primitives/text-field";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import {
  Disclosure,
  DisclosureGroup,
  DisclosureHeader,
  DisclosurePanel,
} from "~/ui/primitives/disclosure";

export const Route = createFileRoute("/register/_wizard/review")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const registration = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow(({ actions: _actions, ...store }) => store),
  );

  const navigate = useNavigate();

  const userOauthProviderMap = {
    [Constants.ENTRA_ID]: "Microsoft Entra ID",
    [Constants.GOOGLE]: "Google",
  };

  function register() {
    const result = v.safeParse(registrationWizardSchema, registration);
    if (!result.success) return toast.error("Invalid registration data.");
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Review</h2>

      <Card>
        <CardContent className="grid gap-4 py-2">
          <DisclosureGroup>
            <Disclosure id={1}>
              <DisclosureHeader>1. Basic Information</DisclosureHeader>

              <DisclosurePanel className="grid gap-4">
                <Field
                  label={{ value: "License Key" }}
                  value={{ value: registration.licenseKey }}
                />

                <Field
                  label={{ value: "Name" }}
                  value={{ value: registration.tenantName }}
                />

                <Field
                  label={{ value: "Slug" }}
                  value={{ value: registration.tenantSlug }}
                />
              </DisclosurePanel>
            </Disclosure>

            <Disclosure id={2}>
              <DisclosureHeader>2. User Login</DisclosureHeader>

              <DisclosurePanel>
                <DisclosurePanel className="grid gap-4">
                  <Field
                    label={{ value: "Type" }}
                    value={{
                      value:
                        userOauthProviderMap[
                          registration.userOauthProviderType
                        ],
                    }}
                  />

                  <Field
                    label={{ value: "Tenant ID" }}
                    value={{ value: registration.userOauthProviderId }}
                  />
                </DisclosurePanel>
              </DisclosurePanel>
            </Disclosure>

            <Disclosure id={3}>
              <DisclosureHeader>3. Tailscale OAuth Client</DisclosureHeader>

              <DisclosurePanel className="grid gap-4">
                <Field
                  label={{ value: "Client ID" }}
                  value={{ value: registration.tailscaleOauthClientId }}
                />

                <Field
                  label={{ value: "Client Secret" }}
                  value={{ value: registration.tailscaleOauthClientSecret }}
                />
              </DisclosurePanel>
            </Disclosure>

            <Disclosure id={4}>
              <DisclosureHeader>4. PaperCut Security</DisclosureHeader>

              <DisclosurePanel className="grid gap-4">
                <Field
                  label={{ value: "Tailnet PaperCut Server URL" }}
                  value={{ value: registration.tailnetPapercutServerUri }}
                />

                <Field
                  label={{ value: "PaperCut Server Auth Token" }}
                  value={{ value: registration.papercutServerAuthToken }}
                />
              </DisclosurePanel>
            </Disclosure>

            <Disclosure id={5}>
              <DisclosureHeader>5. PaperCut User Sync</DisclosureHeader>

              <DisclosurePanel className="grid gap-4">
                <Field
                  label={{ value: "Cron Expression" }}
                  value={{
                    value: registration.papercutSyncSchedule,
                    className: "font-mono",
                  }}
                />

                <Field
                  label={{ value: "Timezone" }}
                  value={{ value: registration.timezone }}
                />
              </DisclosurePanel>
            </Disclosure>
          </DisclosureGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onPress={() => navigate({ to: "/register/5", search: { slug } })}
          className="gap-2"
          variant="secondary"
        >
          <ArrowLeft className="size-5" />
          Back
        </Button>

        <Button className="gap-2" onPress={register}>
          <Send className="size-5" />
          Register
        </Button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: {
    value: string;
    className?: string;
  };
  value: {
    value: string;
    className?: string;
  };
}
const Field = (props: FieldProps) => (
  <div className="grid gap-2">
    <span className={labelStyles({ className: props.label.className })}>
      {props.label.value}
    </span>

    <span
      className={inputStyles({
        className: twMerge("bg-muted/50", props.value.className),
      })}
    >
      {props.value.value}
    </span>
  </div>
);
