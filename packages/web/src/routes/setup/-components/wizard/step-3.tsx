import { useState } from "react";
import { setupWizardStep3Schema } from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import * as R from "remeda";

import { useSetupMachine } from "~/lib/hooks/setup";
import { onSelectionChange } from "~/lib/ui";
import { linkStyles } from "~/styles/components/primitives/link";
import { Markdown } from "~/ui/markdown";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Label } from "~/ui/primitives/field";
import { Tab, TabList, TabPanel, Tabs } from "~/ui/primitives/tabs";
import { Input } from "~/ui/primitives/text-field";

export function SetupWizardStep3() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    tailscaleOauthClientId: context.tailscaleOauthClientId,
    tailscaleOauthClientSecret: context.tailscaleOauthClientSecret,
  }));

  const form = useForm({
    validators: {
      onSubmit: setupWizardStep3Schema,
    },
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

              <form.Field
                name="tailscaleOauthClientId"
                validators={{
                  onBlur: setupWizardStep3Schema.entries.tailscaleOauthClientId,
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

                    {R.isEmpty(field.state.meta.errors) ? null : (
                      <span className="text-sm text-red-500">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="tailscaleOauthClientSecret"
                validators={{
                  onBlur:
                    setupWizardStep3Schema.entries.tailscaleOauthClientSecret,
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

        <form.Subscribe selector={({ canSubmit }) => canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              onPress={() => setSelectedTab(() => "oauth-client")}
              className="gap-2"
              isDisabled={!canSubmit}
            >
              Next <ArrowRight className="size-5" />
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
