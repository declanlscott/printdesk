import { Text } from "react-aria-components";
import { setupWizardStep2Schema } from "@printdesk/core/tenants/shared";
import { Constants } from "@printdesk/core/utils/constants";
import { ArrowLeft, ArrowRight } from "lucide-react";
import * as R from "remeda";

import { useAppForm } from "~/lib/hooks/form";
import { useSetupMachine } from "~/lib/hooks/setup";
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

import type { SetupWizardStep2 } from "@printdesk/core/tenants/shared";

export function SetupWizardStep2() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    identityProviderKind: context.identityProviderKind,
    identityProviderId: context.identityProviderId,
  }));

  const form = useAppForm({
    validators: {
      onSubmit: setupWizardStep2Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) =>
      actorRef.send({ type: "wizard.step2.next", ...value }),
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">2. User Login</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <form.AppField
            name="identityProviderKind"
            validators={{
              onBlur: setupWizardStep2Schema.entries.identityProviderKind,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Select
                  id={field.name}
                  selectedKey={field.state.value}
                  onSelectionChange={(value) =>
                    field.handleChange(
                      value as SetupWizardStep2["identityProviderKind"],
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
                        <Text slot="label">Google Workspace</Text>

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
          </form.AppField>

          <form.AppField
            name="identityProviderId"
            validators={{
              onBlur: setupWizardStep2Schema.entries.identityProviderId,
            }}
          >
            {(field) => (
              <field.TextField
                labelProps={{ children: "Tenant ID" }}
                descriptionProps={{
                  children: "The ID of your tenant, as listed in Entra ID.",
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
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onPress={() => actorRef.send({ type: "wizard.back" })}
          className="gap-2"
          variant="secondary"
        >
          <ArrowLeft className="size-5" />
          Back
        </Button>

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
