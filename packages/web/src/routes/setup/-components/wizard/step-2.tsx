import { Text } from "react-aria-components";
import { setupWizardStep2Schema } from "@printworks/core/tenants/shared";
import { Constants } from "@printworks/core/utils/constants";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, ArrowRight } from "lucide-react";
import * as R from "remeda";

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
import { Input } from "~/ui/primitives/text-field";

import type { SetupWizardStep2 } from "@printworks/core/tenants/shared";

export function SetupWizardStep2() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    userOauthProviderType: context.userOauthProviderType,
    userOauthProviderId: context.userOauthProviderId,
  }));

  const form = useForm({
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
          <form.Field
            name="userOauthProviderType"
            validators={{
              onBlur: setupWizardStep2Schema.entries.userOauthProviderType,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Select
                  id={field.name}
                  selectedKey={field.state.value}
                  onSelectionChange={(value) =>
                    field.handleChange(
                      value as SetupWizardStep2["userOauthProviderType"],
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
              onBlur: setupWizardStep2Schema.entries.userOauthProviderId,
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

                {R.isEmpty(field.state.meta.errors) ? null : (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                )}
              </div>
            )}
          </form.Field>
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
