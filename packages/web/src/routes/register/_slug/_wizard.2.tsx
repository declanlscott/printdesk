import { Text } from "react-aria-components";
import { registrationWizardStep2Schema } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationStoreApi } from "~/lib/stores/registration";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
  SelectValue,
} from "~/ui/primitives/select";
import { Input } from "~/ui/primitives/text-field";

import type { RegistrationWizardStep2 } from "@printworks/core/tenants/shared";

export const Route = createFileRoute("/register/_slug/_wizard/2")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_slug").useLoaderData();

  const defaultValues = useStore(
    RegistrationStoreApi.use(),
    useShallow((store) => ({
      userOauthProviderType: store.userOauthProviderType,
      userOauthProviderId: store.userOauthProviderId,
    })),
  );

  const { complete } = RegistrationStoreApi.useActions();

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep2Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      complete({ step: 2, ...value });

      await navigate({ to: "/register/3", search: { slug } });
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // await form.handleSubmit();
        await navigate({ to: "/register/3", search: { slug } });
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">2. User Login</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <form.Field
            name="userOauthProviderType"
            validators={{
              onBlur:
                registrationWizardStep2Schema.entries.userOauthProviderType,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Select
                  id={field.name}
                  selectedKey={field.state.value}
                  onSelectionChange={(value) =>
                    field.handleChange(
                      value as RegistrationWizardStep2["userOauthProviderType"],
                    )
                  }
                  onBlur={field.handleBlur}
                >
                  <div className="grid gap-2">
                    <Label htmlFor={field.name}>Type</Label>

                    <CardDescription>
                      The authentication provider for users to log in with.
                      Currently only Microsoft Entra ID is supported.
                    </CardDescription>

                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </div>

                  <SelectPopover>
                    <SelectListBox>
                      <SelectItem
                        id={Constants.ENTRA_ID}
                        textValue="Microsoft Entra ID"
                      >
                        Microsoft Entra ID
                      </SelectItem>

                      <SelectItem
                        id={Constants.GOOGLE}
                        textValue="Google"
                        isDisabled
                        className="flex flex-col items-start justify-center"
                      >
                        <Text slot="label">Google</Text>

                        <Text
                          className="text-muted-foreground text-sm"
                          slot="description"
                        >
                          On the roadmap
                        </Text>
                      </SelectItem>
                    </SelectListBox>
                  </SelectPopover>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Field
            name="userOauthProviderId"
            validators={{
              onBlur: registrationWizardStep2Schema.entries.userOauthProviderId,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Tenant ID</Label>

                <CardDescription>
                  The ID of your tenant, as listed in Entra ID.
                </CardDescription>

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
          onPress={() => navigate({ to: "/register/1", search: { slug } })}
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
