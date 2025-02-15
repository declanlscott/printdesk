import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";
import { registrationWizardStep4Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";

import { useCopyToClipboard } from "~/lib/hooks/copy-to-clipboard";
import { useRegistrationMachine } from "~/lib/hooks/registration";
import { linkStyles } from "~/styles/components/primitives/link";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export function RegistrationWizardStep4() {
  const registrationMachine = useRegistrationMachine();

  const actorRef = registrationMachine.useActorRef();

  const defaultValues = registrationMachine.useSelector(({ context }) => ({
    tailnetPapercutServerUri: context.tailnetPapercutServerUri,
    papercutServerAuthToken: context.papercutServerAuthToken,
  }));

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep4Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) =>
      actorRef.send({ type: "wizard.step4.next", ...value }),
  });

  const [isTokenVisible, setIsTokenVisible] = useState(() => false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">4. PaperCut: Security</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <CardDescription>
            The PaperCut API requires two layers of security: IP address
            whitelisting and token authentication.
          </CardDescription>

          <CardDescription>
            Configure your PaperCut so that{" "}
            <CopyText text="100.64.0.0/255.192.0.0" /> is included in the list
            of approved addresses. Then, add a secret token to the{" "}
            <CopyText text="auth.webservices.auth-token" /> config key.
          </CardDescription>

          <CardDescription>
            For more detailed instructions on how to do the above, please refer
            to the{" "}
            <a
              href="https://www.papercut.com/help/manuals/ng-mf/common/tools-web-services/#security"
              className={linkStyles()}
              target="_blank"
            >
              official PaperCut documentation
            </a>
            .
          </CardDescription>

          <form.Field
            name="tailnetPapercutServerUri"
            validators={{
              onBlur:
                registrationWizardStep4Schema.entries.tailnetPapercutServerUri,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Tailnet PaperCut Server URL</Label>

                <CardDescription>
                  The URL of the server with the tailnet address as listed in
                  the{" "}
                  <a
                    href="https://login.tailscale.com"
                    className={linkStyles()}
                    target="_blank"
                  >
                    admin console
                  </a>
                  .
                </CardDescription>

                <Input
                  id={field.name}
                  type="url"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="http://100.x.x.x:9191"
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
            name="papercutServerAuthToken"
            validators={{
              onBlur:
                registrationWizardStep4Schema.entries.papercutServerAuthToken,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>PaperCut Server Auth Token</Label>

                <CardDescription>
                  The auth token you configured on your server. Printworks
                  encrypts this and it will <strong>not</strong> be accessible
                  to you after completing registration.
                </CardDescription>

                <div className="flex gap-2">
                  <Input
                    id={field.name}
                    type={isTokenVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />

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

interface CopyTextProps {
  text: string;
}
function CopyText(props: CopyTextProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    onCopy: () => toast.success(`Copied "${props.text}" to the clipboard!`),
  });

  return (
    <AriaButton
      onPress={() => copyToClipboard(props.text)}
      className="text-medium bg-muted hover:bg-muted/60 inline-flex cursor-pointer select-text items-center gap-1.5 break-words rounded-md px-1.5 font-mono outline-none transition-colors"
    >
      {isCopied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}

      {props.text}
    </AriaButton>
  );
}
