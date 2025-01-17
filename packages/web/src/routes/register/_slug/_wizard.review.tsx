import { useState } from "react";
import { registrationSchema } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import * as v from "valibot";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useMutationOptions } from "~/lib/hooks/data";
import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationStoreApi } from "~/lib/stores/registration";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent } from "~/ui/primitives/card";
import {
  Disclosure,
  DisclosureGroup,
  DisclosureHeader,
  DisclosurePanel,
} from "~/ui/primitives/disclosure";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

import type {
  RegistrationWizardStep1,
  RegistrationWizardStep2,
  RegistrationWizardStep3,
  RegistrationWizardStep4,
  RegistrationWizardStep5,
} from "@printworks/core/tenants/shared";

export const Route = createFileRoute("/register/_slug/_wizard/review")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_slug").useLoaderData();

  const registration = useStore(
    RegistrationStoreApi.use(),
    useShallow(({ actions: _actions, ...store }) => store),
  );

  const navigate = useNavigate();

  const mutation = useMutation({
    ...useMutationOptions().register(),
    onSuccess: (data) => {
      //
    },
  });

  function register() {
    const result = v.safeParse(registrationSchema, registration);
    if (!result.success) return toast.error("Invalid registration data.");

    mutation.mutate(result.output);
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Review</h2>

      <Card>
        <CardContent className="grid gap-4 py-2">
          <DisclosureGroup>
            <Step1
              licenseKey={registration.licenseKey}
              tenantName={registration.tenantName}
              tenantSlug={registration.tenantSlug}
            />

            <Step2
              userOauthProviderType={registration.userOauthProviderType}
              userOauthProviderId={registration.userOauthProviderId}
            />

            <Step3
              tailscaleOauthClientId={registration.tailscaleOauthClientId}
              tailscaleOauthClientSecret={
                registration.tailscaleOauthClientSecret
              }
            />

            <Step4
              tailnetPapercutServerUri={registration.tailnetPapercutServerUri}
              papercutServerAuthToken={registration.papercutServerAuthToken}
            />

            <Step5
              papercutSyncSchedule={registration.papercutSyncSchedule}
              timezone={registration.timezone}
            />
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

function Step1(props: RegistrationWizardStep1) {
  return (
    <Disclosure id={1}>
      <DisclosureHeader>1. Basic Information</DisclosureHeader>

      <DisclosurePanel className="grid gap-4">
        <div className="grid gap-2">
          <Label>License Key</Label>

          <Input disabled value={props.licenseKey} />
        </div>

        <div className="grid gap-2">
          <Label>Name</Label>

          <Input disabled value={props.tenantName} />
        </div>

        <div className="grid gap-2">
          <Label>Slug</Label>

          <Input disabled value={props.tenantSlug} />
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function Step2(props: RegistrationWizardStep2) {
  const userOauthProviderMap = {
    [Constants.ENTRA_ID]: "Microsoft Entra ID",
    [Constants.GOOGLE]: "Google",
  };

  return (
    <Disclosure id={2}>
      <DisclosureHeader>2. User Login</DisclosureHeader>

      <DisclosurePanel>
        <DisclosurePanel className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type</Label>

            <Input
              disabled
              value={userOauthProviderMap[props.userOauthProviderType]}
            />
          </div>

          <div className="grid gap-2">
            <Label>Tenant ID</Label>

            <Input disabled value={props.userOauthProviderId} />
          </div>
        </DisclosurePanel>
      </DisclosurePanel>
    </Disclosure>
  );
}

function Step3(props: RegistrationWizardStep3) {
  const [isSecretVisible, setIsSecretVisible] = useState(() => false);

  return (
    <Disclosure id={3}>
      <DisclosureHeader>3. Tailscale OAuth Client</DisclosureHeader>

      <DisclosurePanel className="grid gap-4">
        <div className="grid gap-2">
          <Label>Client ID</Label>

          <Input disabled value={props.tailscaleOauthClientId} />
        </div>

        <div className="grid gap-2">
          <Label>Client Secret</Label>

          <div className="flex gap-2">
            <Input disabled value={props.tailscaleOauthClientSecret} />

            <Button
              variant="ghost"
              size="icon"
              onPress={() =>
                setIsSecretVisible((isSecretVisible) => !isSecretVisible)
              }
            >
              {isSecretVisible ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function Step4(props: RegistrationWizardStep4) {
  const [isTokenVisible, setIsTokenVisible] = useState(() => false);

  return (
    <Disclosure id={4}>
      <DisclosureHeader>4. PaperCut Security</DisclosureHeader>

      <DisclosurePanel className="grid gap-4">
        <div className="grid gap-2">
          <Label>Tailnet PaperCut Server URL</Label>

          <Input disabled value={props.tailnetPapercutServerUri} />
        </div>

        <div className="grid gap-2">
          <Label>PaperCut Server Auth Token</Label>

          <div className="flex gap-2">
            <Input disabled value={props.papercutServerAuthToken} />

            <Button
              variant="ghost"
              size="icon"
              onPress={() =>
                setIsTokenVisible((isTokenVisible) => !isTokenVisible)
              }
            >
              {isTokenVisible ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

function Step5(props: RegistrationWizardStep5) {
  return (
    <Disclosure id={5}>
      <DisclosureHeader>5. PaperCut User Sync</DisclosureHeader>

      <DisclosurePanel className="grid gap-4">
        <div className="grid gap-2">
          <Label>Cron Expression</Label>

          <Input
            disabled
            value={props.papercutSyncSchedule}
            className="font-mono"
          />
        </div>

        <div className="grid gap-2">
          <Label>Timezone</Label>

          <Input disabled value={props.timezone} />
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
