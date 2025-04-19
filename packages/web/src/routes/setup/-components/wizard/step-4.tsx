import { useState } from "react";
import { Button as AriaButton } from "react-aria-components";
import { setupWizardStep4Schema } from "@printworks/core/tenants/shared";
import { ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";

import { useCopyToClipboard } from "~/lib/hooks/copy-to-clipboard";
import { useAppForm } from "~/lib/hooks/form";
import { useSetupMachine } from "~/lib/hooks/setup";
import { onSelectionChange } from "~/lib/ui";
import { linkStyles } from "~/styles/components/primitives/link";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import { Tab, TabList, TabPanel, Tabs } from "~/ui/primitives/tabs";

export function SetupWizardStep4() {
  const setupMachine = useSetupMachine();

  const actorRef = setupMachine.useActorRef();

  const defaultValues = setupMachine.useSelector(({ context }) => ({
    tailnetPapercutServerUri: context.tailnetPapercutServerUri,
    papercutServerAuthToken: context.papercutServerAuthToken,
  }));

  const form = useAppForm({
    validators: { onSubmit: setupWizardStep4Schema },
    defaultValues,
    onSubmit: async ({ value }) =>
      actorRef.send({ type: "wizard.step4.next", ...value }),
  });

  const tabs = ["setup", "security"] as const;
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]>(() =>
    Object.values(defaultValues).some(Boolean) ? "security" : "setup",
  );

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
      <h2 className="text-xl font-semibold">4. PaperCut</h2>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={onSelectionChange(tabs, setSelectedTab)}
      >
        <TabList>
          <Tab id="setup" className="w-full">
            Setup
          </Tab>

          <Tab id="security" className="w-full">
            Security
          </Tab>
        </TabList>

        <TabPanel id="setup">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <CardDescription>
                The PaperCut API requires two layers of security: IP address
                whitelisting and token authentication.
              </CardDescription>

              <CardDescription>
                Configure your PaperCut so that{" "}
                <CopyText text="100.64.0.0/255.192.0.0" /> is included in the
                list of allowed addresses. Then, add a secret token to the{" "}
                <CopyText text="auth.webservices.auth-token" /> config key.
              </CardDescription>

              <CardDescription>
                For more detailed instructions on how to do the above, please
                refer to the{" "}
                <a
                  href="https://www.papercut.com/help/manuals/ng-mf/common/tools-web-services/#web-services-api-security"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  official PaperCut documentation
                </a>
                .
              </CardDescription>

              <CardDescription>
                Tailscale must also be{" "}
                <a
                  href="https://tailscale.com/kb/1347/installation"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  installed
                </a>{" "}
                and enabled on the host of your PaperCut server.
              </CardDescription>

              <CardDescription>
                To avoid any potential issues in the future, make sure to
                disable key expiry for the machine in the{" "}
                <a
                  href="https://login.tailscale.com/admin/machines"
                  className={linkStyles({ className: "hover:underline" })}
                  target="_blank"
                >
                  admin console
                </a>
                .
              </CardDescription>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel id="security">
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <form.AppField
                name="tailnetPapercutServerUri"
                validators={{
                  onBlur:
                    setupWizardStep4Schema.entries.tailnetPapercutServerUri,
                }}
              >
                {(field) => (
                  <field.TextField
                    labelProps={{ children: "Tailnet PaperCut Server URL" }}
                    descriptionProps={{
                      children: (
                        <>
                          The URL of the server using the tailnet address as
                          listed in the{" "}
                          <a
                            href="https://login.tailscale.com/admin/machines"
                            className={linkStyles({
                              className: "hover:underline",
                            })}
                            target="_blank"
                          >
                            admin console
                          </a>
                          .
                        </>
                      ),
                    }}
                    inputProps={{
                      type: "url",
                      placeholder: "http://100.x.x.x:9191",
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

              <form.AppField
                name="papercutServerAuthToken"
                validators={{
                  onBlur:
                    setupWizardStep4Schema.entries.papercutServerAuthToken,
                }}
              >
                {(field) => (
                  <field.TextField
                    labelProps={{ children: "PaperCut Server Auth Token" }}
                    descriptionProps={{
                      children: (
                        <>
                          The auth token you configured on your server.
                          Printworks encrypts this and it will{" "}
                          <strong>not</strong> be accessible to you after
                          completing setup.
                        </>
                      ),
                    }}
                    inputProps={{
                      type: isTokenVisible ? "text" : "password",
                    }}
                    groupProps={{
                      className: "flex gap-2",
                      children: (
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() =>
                            setIsTokenVisible(
                              (isTokenVisible) => !isTokenVisible,
                            )
                          }
                        >
                          {isTokenVisible ? (
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
          <form.SubmitButton onPress={() => setSelectedTab(() => "security")}>
            Next
            <ArrowRight className="size-5" />
          </form.SubmitButton>
        </form.AppForm>
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
