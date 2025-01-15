import { useMemo } from "react";
import {
  UNSTABLE_ListLayout,
  UNSTABLE_Virtualizer,
} from "react-aria-components";
import {
  defaultPapercutSyncSchedule,
  registrationWizardStep5Schema,
} from "@printworks/core/tenants/shared";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronsUpDown } from "lucide-react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { useRouteApi } from "~/lib/hooks/route-api";
import { RegistrationWizardStoreApi } from "~/lib/stores/registration-wizard";
import { collectionItem } from "~/lib/ui";
import { Button } from "~/ui/primitives/button";
import { Card, CardContent, CardDescription } from "~/ui/primitives/card";
import {
  BaseCombobox,
  ComboboxCollection,
  ComboboxInput,
  ComboboxItem,
  ComboboxListBox,
  ComboboxPopover,
} from "~/ui/primitives/combobox";
import { FieldGroup, Label } from "~/ui/primitives/field";
import { Input } from "~/ui/primitives/text-field";

export const Route = createFileRoute("/register/_wizard/5")({
  component: RouteComponent,
});

function RouteComponent() {
  const slug = useRouteApi("/register/_wizard").useLoaderData();

  const defaultValues = useStore(
    RegistrationWizardStoreApi.use(),
    useShallow((store) => ({
      papercutSyncSchedule: store.papercutSyncSchedule,
      timezone: store.timezone,
    })),
  );

  const { submit } = RegistrationWizardStoreApi.useActions();

  const navigate = useNavigate();

  const form = useForm({
    validators: {
      onSubmit: registrationWizardStep5Schema,
    },
    defaultValues,
    onSubmit: async ({
      value: { papercutSyncSchedule = defaultPapercutSyncSchedule, ...value },
    }) => {
      submit({ step: 5, papercutSyncSchedule, ...value });

      await navigate({ to: "/register/review", search: { slug } });
    },
  });

  const timezones = useMemo(
    () => Intl.supportedValuesOf("timeZone").map(collectionItem),
    [],
  );

  const layout = useMemo(
    () =>
      new UNSTABLE_ListLayout({
        rowHeight: 32,
      }),
    [],
  );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        // await form.handleSubmit();
        await navigate({ to: "/register/review", search: { slug } });
      }}
      className="grid gap-4"
    >
      <h2 className="text-xl font-semibold">5. PaperCut: User Sync</h2>

      <Card>
        <CardContent className="grid gap-4 pt-6">
          <CardDescription>
            Printworks synchronizes with PaperCut's usernames and shared
            accounts such that users only have access to the same accounts they
            have in PaperCut
          </CardDescription>

          <CardDescription>
            You shouldn't need to change from the default settings below.
          </CardDescription>

          <form.Field name="papercutSyncSchedule">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Cron Expression</Label>

                <CardDescription>
                  Cron expression for running the sync job. By default, this is
                  set to every night at 1:55 AM.
                </CardDescription>

                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={defaultPapercutSyncSchedule}
                  className="font-mono"
                />

                {field.state.meta.errors.length > 0 ? (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors.join(", ")}
                  </span>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field name="timezone">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Timezone</Label>

                <CardDescription>
                  The timezone to use for the cron job.
                </CardDescription>

                <BaseCombobox
                  aria-label="Timezone"
                  onSelectionChange={(value) => {
                    if (typeof value === "string") field.handleChange(value);
                  }}
                  selectedKey={field.state.value}
                >
                  <FieldGroup className="p-0">
                    <ComboboxInput aria-controls="timezone-listbox" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 size-6 p-1"
                    >
                      <ChevronsUpDown
                        aria-hidden="true"
                        className="size-4 opacity-50"
                      />
                    </Button>
                  </FieldGroup>

                  <ComboboxPopover>
                    <UNSTABLE_Virtualizer layout={layout}>
                      <ComboboxListBox id="timezone-listbox">
                        <ComboboxCollection items={timezones}>
                          {(timezone) => (
                            <ComboboxItem
                              textValue={timezone.name}
                              id={timezone.name}
                              key={timezone.name}
                            >
                              {timezone.name}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                      </ComboboxListBox>
                    </UNSTABLE_Virtualizer>
                  </ComboboxPopover>
                </BaseCombobox>
              </div>
            )}
          </form.Field>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onPress={() => navigate({ to: "/register/4", search: { slug } })}
          className="gap-2"
          variant="secondary"
        >
          <ArrowLeft className="size-5" />
          Back
        </Button>

        <form.Subscribe selector={({ canSubmit }) => canSubmit}>
          {(canSubmit) => (
            <Button type="submit" className="gap-2" isDisabled={!canSubmit}>
              Review <ArrowRight className="size-5" />
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
