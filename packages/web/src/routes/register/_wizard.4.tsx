import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";
import { registrationWizardStep4Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useCopyToClipboard } from "~/lib/hooks/copy-to-clipboard";
import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export const Route = createFileRoute("/register/_wizard/4")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const defaultValues = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow((store) => ({
      tailnetPapercutServerUri: store.tailnetPapercutServerUri,
      papercutServerAuthToken: store.papercutServerAuthToken,
    })),
  );

  const { submit } = RegistrationWizardStoreApi.useActions();

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep4Schema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      submit({ step: 4, ...value });

      await navigate({ to: "/register/5", search: { slug } });
    },
  });

  const [isTokenVisible, setIsTokenVisible] = useState(() => false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // await form.handleSubmit();
        await navigate({ to: "/register/5", search: { slug } });
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
              className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
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
                    className="text-primary font-medium underline-offset-4 transition-colors hover:underline"
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

                {field.state.meta.errors.length > 0 ? (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                ) : null}
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
                  encrypts this and will <strong>not</strong> be visible after
                  completing registration.
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
          onPress={() => navigate({ to: "/register/3", search: { slug } })}
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
