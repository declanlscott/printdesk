import { useState } from "react";
import { registrationWizardStep3Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

import { useRegistrationMachine } from "~/lib/hooks/registration";
import { linkStyles } from "~/styles/components/primitives/link";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export function RegistrationWizardStep3() {
  const registrationMachine = useRegistrationMachine();

  const actorRef = registrationMachine.useActorRef();

  const defaultValues = registrationMachine.useSelector(({ context }) => ({
    tailscaleOauthClientId: context.tailscaleOauthClientId,
    tailscaleOauthClientSecret: context.tailscaleOauthClientSecret,
  }));

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep3Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) =>
      actorRef.send({ type: "wizard.step3.next", ...value }),
  });

  const [isSecretVisible, setIsSecretVisible] = useState(() => false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">3. Tailscale Setup</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <CardDescription>
            <a
              href="https://tailscale.com/"
              className={linkStyles()}
              target="_blank"
            >
              Tailscale
            </a>{" "}
            facilitates the secure network connection between Printworks and
            your PaperCut server. If you haven't already, create an OAuth client
            in the Tailscale{" "}
            <a
              href="https://login.tailscale.com"
              className={linkStyles()}
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
              className={linkStyles()}
              target="_blank"
            >
              installed
            </a>{" "}
            and enabled on the host of your PaperCut server.
          </CardDescription>

          <CardDescription>
            Printworks encrypts the OAuth client data and it will{" "}
            <strong>not</strong> be accessible to you after completing
            registration.
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
            name="tailscaleOauthClientSecret"
            validators={{
              onBlur:
                registrationWizardStep3Schema.entries
                  .tailscaleOauthClientSecret,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Client Secret</Label>

                <div className="flex gap-2">
                  <Input
                    id={field.name}
                    type={isSecretVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />

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
