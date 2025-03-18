import { useState } from "react";
import { setupWizardStep3Schema } from "@printworks/core/tenants/shared";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import * as R from "remeda";

import { useAppForm } from "~/lib/hooks/form";
import { useSetupMachine } from "~/lib/hooks/setup";
import { onSelectionChange } from "~/lib/ui";
import { linkStyles } from "~/styles/components/primitives/link";
import { Markdown } from "~/ui/markdown";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Tab, TabList, TabPanel, Tabs } from "~/ui/primitives/tabs";

export function SetupWizardStep3() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    tailscaleOauthClientId: context.tailscaleOauthClientId,
    tailscaleOauthClientSecret: context.tailscaleOauthClientSecret,
  }));

  const form = useAppForm({
    validators: { onSubmit: setupWizardStep3Schema },
    defaultValues,
    onSubmit: async ({ value }) =>
      actorRef.send({ type: "wizard.step3.next", ...value }),
  });

  const tabs = ["setup", "oauth-client"] as const;
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]>(() =>
    Object.values(defaultValues).some(Boolean) ? "oauth-client" : "setup",
  );

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
      <h2 className="text-xl font-semibold">3. Tailscale</h2>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={onSelectionChange(tabs, setSelectedTab)}
      >
        <TabList>
          <Tab id="setup" className="w-full">
            Setup
          </Tab>

          <Tab id="oauth-client" className="w-full">
            OAuth Client
          </Tab>
        </TabList>

        <TabPanel id="setup">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <CardDescription>
                <a
                  href="https://tailscale.com/"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  Tailscale
                </a>{" "}
                facilitates the secure network connection between Printworks and
                your PaperCut server.
              </CardDescription>

              <CardDescription>
                First, go to the{" "}
                <a
                  href="https://login.tailscale.com/admin/acls/file"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  Access Controls
                </a>{" "}
                in your Tailscale admin console and add a tag called
                "printworks" to the tagOwners block, for example:
              </CardDescription>

              <Markdown>
                {[
                  "```json",
                  '"tagOwners": {',
                  '  "tag:printworks": ["autogroup:admin"],',
                  "}",
                ].join("\n")}
              </Markdown>

              <CardDescription>
                Next,{" "}
                <a
                  href="https://login.tailscale.com/admin/settings/oauth"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  generate an OAuth client
                </a>{" "}
                with write scopes for core devices and auth keys. Don't forget
                to add the "printworks" tag you just created on both scopes.
              </CardDescription>

              <CardDescription>
                Copy the generated client ID and client secret values and paste
                them into the fields in the next tab.
              </CardDescription>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel id="oauth-client">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <CardDescription>
                Printworks encrypts the OAuth client data and it will not be
                accessible to you after completing setup.
              </CardDescription>

              <form.AppField
                name="tailscaleOauthClientId"
                validators={{
                  onBlur: setupWizardStep3Schema.entries.tailscaleOauthClientId,
                }}
              >
                {(field) => (
                  <field.TextField
                    labelProps={{ children: "Client ID" }}
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
                name="tailscaleOauthClientSecret"
                validators={{
                  onBlur:
                    setupWizardStep3Schema.entries.tailscaleOauthClientSecret,
                }}
              >
                {(field) => (
                  <field.TextField
                    labelProps={{ children: "Client Secret" }}
                    inputProps={{ type: isSecretVisible ? "text" : "password" }}
                    groupProps={{
                      className: "flex gap-2",
                      children: (
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() =>
                            setIsSecretVisible(
                              (isSecretVisible) => !isSecretVisible,
                            )
                          }
                        >
                          {isSecretVisible ? (
                            <EyeOff className="size-5" />
                          ) : (
                            <Eye className="size-5" />
                          )}
                        </Button>
                      ),
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
        </TabPanel>
      </Tabs>

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
          <form.SubmitButton
            onPress={() => setSelectedTab(() => "oauth-client")}
          >
            Next
            <ArrowRight className="size-5" />
          </form.SubmitButton>
        </form.AppForm>
      </div>
    </form>
  );
}
