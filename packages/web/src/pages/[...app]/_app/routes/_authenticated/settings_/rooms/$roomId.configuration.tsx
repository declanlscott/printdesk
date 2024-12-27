import { FileTrigger } from "react-aria-components";
import {
  deliveryOptionsSchema,
  workflowSchema,
  workflowStatusTypes,
} from "@printworks/core/rooms/shared";
import { formatPascalCase } from "@printworks/core/utils/shared";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Import, Plus, Save, X } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { Checkbox } from "~/app/components/ui/primitives/checkbox";
import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  SliderTrack,
} from "~/app/components/ui/primitives/color";
import { Dialog, DialogTrigger } from "~/app/components/ui/primitives/dialog";
import { FieldGroup, Label } from "~/app/components/ui/primitives/field";
import { IconButton } from "~/app/components/ui/primitives/icon-button";
import {
  NumberField,
  NumberFieldInput,
  NumberFieldSteppers,
} from "~/app/components/ui/primitives/number-field";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
} from "~/app/components/ui/primitives/select";
import { Input } from "~/app/components/ui/primitives/text-field";
import { query, useMutator } from "~/app/lib/hooks/data";
import { useSubscribe } from "~/app/lib/hooks/replicache";
import { collectionItem } from "~/app/lib/ui";
import { cardStyles } from "~/styles/components/primitives/card";

import type { PostReviewWorkflowStatusType } from "@printworks/core/rooms/shared";

const routeId = "/_authenticated/settings_/rooms/$roomId/configuration";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.actor.properties.id, routeId),
    ),
  loader: async ({ context, params }) => {
    const [initialDeliveryOptions, initialWorkflow] = await Promise.all([
      context.replicache.query(query.deliveryOptions(params.roomId)),
      context.replicache.query(query.workflow(params.roomId)),
    ]);

    return { initialDeliveryOptions, initialWorkflow };
  },
  component: Component,
});

function Component() {
  return (
    <div className="grid gap-6">
      <WorkflowCard />

      <DeliveryOptionsCard />
    </div>
  );
}

function WorkflowCard() {
  const roomId = Route.useParams().roomId;

  const workflow = useSubscribe(query.workflow(roomId), {
    defaultData: Route.useLoaderData().initialWorkflow,
  });

  const { setWorkflow } = useMutator();

  const form = useForm({
    defaultValues: { workflow },
    validators: { onBlur: v.object({ workflow: workflowSchema }) },
    onSubmit: async ({ value }) => {
      if (!R.isDeepEqual(value.workflow, workflow))
        await setWorkflow({ workflow: value.workflow, roomId });
    },
  });

  return (
    <form
      className={cardStyles().base()}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await form.handleSubmit();
      }}
    >
      <CardHeader>
        <div className="flex justify-between gap-4">
          <CardTitle>Workflow</CardTitle>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.values.workflow]}
          >
            {([canSubmit, value]) => (
              <Button
                type="submit"
                isDisabled={!canSubmit || R.isDeepEqual(value, workflow)}
              >
                <Save className="mr-2 size-5" />
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>

        <CardDescription>
          The workflow determines the stages (or status) through which orders
          will progress. The workflow is displayed in the dashboard interface
          for operators.
        </CardDescription>

        <form.Subscribe selector={(state) => state.errors}>
          {(errors) => (
            <ul className="list-disc pl-6 pt-2">
              {errors.map((e, i) => (
                <li key={i} className="text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </form.Subscribe>
      </CardHeader>

      <form.Field name="workflow" mode="array">
        {({ state, removeValue, moveValue, pushValue, validate, setValue }) => (
          <>
            <CardContent>
              <ol className="space-y-4">
                {state.value.map((status, i) => (
                  <li
                    key={status.id}
                    className={cardStyles().base({
                      className:
                        "bg-muted/20 relative grid grid-cols-2 gap-2 p-4",
                    })}
                  >
                    <div className="absolute right-2.5 top-2.5 flex gap-2">
                      <IconButton
                        onPress={() => {
                          moveValue(i, i + 1);
                          void validate("blur");
                        }}
                        isDisabled={i === state.value.length - 1}
                        aria-label={`Move ${status.id} down`}
                      >
                        <ChevronDown />
                      </IconButton>

                      <IconButton
                        onPress={() => {
                          moveValue(i, i - 1);
                          void validate("blur");
                        }}
                        isDisabled={i === 0}
                        aria-label={`Move ${status.id} up`}
                      >
                        <ChevronUp />
                      </IconButton>

                      <IconButton
                        onPress={() =>
                          removeValue(i).then(() => void validate("blur"))
                        }
                        aria-label={`Remove ${status.id}`}
                      >
                        <X />
                      </IconButton>
                    </div>

                    <form.Field name={`workflow[${i}].id`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Name</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].type`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Type</Label>

                          <Select
                            id={name}
                            aria-label="type"
                            selectedKey={state.value}
                            onSelectionChange={(value) =>
                              handleChange(
                                value as PostReviewWorkflowStatusType,
                              )
                            }
                            onBlur={handleBlur}
                          >
                            <SelectTrigger>
                              {formatPascalCase(state.value ?? "")}
                            </SelectTrigger>

                            <SelectPopover>
                              <SelectListBox
                                items={workflowStatusTypes.map(collectionItem)}
                              >
                                {(item) => (
                                  <SelectItem
                                    id={item.name}
                                    textValue={formatPascalCase(item.name)}
                                  >
                                    {formatPascalCase(item.name)}
                                  </SelectItem>
                                )}
                              </SelectListBox>
                            </SelectPopover>
                          </Select>
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].charging`}>
                      {({ state, handleChange, handleBlur }) => (
                        <Checkbox
                          isSelected={state.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <span className="text-sm">Charging</span>
                        </Checkbox>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].color`}>
                      {({ state, handleChange }) => (
                        <div className="flex items-center justify-end">
                          <ColorPicker
                            value={state.value ?? "#000"}
                            onChange={(color) =>
                              handleChange(color.toString("hex"))
                            }
                          >
                            <DialogTrigger>
                              <Button
                                variant="ghost"
                                className="flex h-fit items-center gap-2 p-1"
                              >
                                Hex Color
                                <ColorSwatch className="size-8 rounded-md border-2" />
                              </Button>

                              <Popover
                                placement="bottom start"
                                className="w-fit"
                              >
                                <Dialog className="flex flex-col gap-4 p-3 outline-none">
                                  <div>
                                    <ColorArea
                                      colorSpace="hsb"
                                      xChannel="saturation"
                                      yChannel="brightness"
                                      className="h-[164px] rounded-b-none border-b-0"
                                    >
                                      <ColorThumb className="z-50" />
                                    </ColorArea>

                                    <ColorSlider colorSpace="hsb" channel="hue">
                                      <SliderTrack className="rounded-t-none border-t-0">
                                        <ColorThumb className="top-1/2" />
                                      </SliderTrack>
                                    </ColorSlider>
                                  </div>

                                  <ColorField
                                    colorSpace="hsb"
                                    className="w-[192px]"
                                  >
                                    <Label>Hex</Label>

                                    <Input className="" />
                                  </ColorField>

                                  <ColorSwatchPicker className="w-[192px]">
                                    <ColorSwatchPickerItem color="#F00">
                                      <ColorSwatch />
                                    </ColorSwatchPickerItem>

                                    <ColorSwatchPickerItem color="#f90">
                                      <ColorSwatch />
                                    </ColorSwatchPickerItem>

                                    <ColorSwatchPickerItem color="#0F0">
                                      <ColorSwatch />
                                    </ColorSwatchPickerItem>

                                    <ColorSwatchPickerItem color="#08f">
                                      <ColorSwatch />
                                    </ColorSwatchPickerItem>

                                    <ColorSwatchPickerItem color="#00f">
                                      <ColorSwatch />
                                    </ColorSwatchPickerItem>
                                  </ColorSwatchPicker>
                                </Dialog>
                              </Popover>
                            </DialogTrigger>
                          </ColorPicker>
                        </div>
                      )}
                    </form.Field>
                  </li>
                ))}
              </ol>
            </CardContent>

            <CardFooter className="justify-between">
              <FileTrigger
                acceptedFileTypes={["application/json"]}
                onSelect={(fileList) => {
                  if (fileList) {
                    const file = Array.from(fileList).at(0);

                    if (file) {
                      const reader = new FileReader();

                      reader.onload = async (e) => {
                        const text = e.target?.result;
                        if (typeof text !== "string") return;

                        let data: unknown;
                        try {
                          data = JSON.parse(text);
                        } catch (e) {
                          console.error(e);
                          return toast.error("Invalid JSON syntax.");
                        }

                        const result = v.safeParse(workflowSchema, data);

                        if (!result.success) {
                          console.error(result.issues);
                          return toast.error("Invalid JSON schema.");
                        }

                        setValue(result.output);
                        return toast.success("Workflow successfully imported.");
                      };

                      reader.onerror = console.error;

                      reader.readAsText(file);
                    }
                  }
                }}
              >
                <Button variant="outline">
                  <Import className="mr-2 size-5" />
                  Import
                </Button>
              </FileTrigger>

              <Button
                variant="secondary"
                onPress={() =>
                  pushValue({
                    id: "",
                    type: "New",
                    color: null,
                    charging: false,
                  })
                }
              >
                <Plus className="mr-2 size-5" />
                Add
              </Button>
            </CardFooter>
          </>
        )}
      </form.Field>
    </form>
  );
}

function DeliveryOptionsCard() {
  const { roomId } = Route.useParams();

  const deliveryOptions = useSubscribe(query.deliveryOptions(roomId), {
    defaultData: Route.useLoaderData().initialDeliveryOptions,
  });

  const { setDeliveryOptions } = useMutator();

  const form = useForm({
    defaultValues: { deliveryOptions },
    validators: {
      onBlur: v.object({ deliveryOptions: deliveryOptionsSchema }),
    },
    onSubmit: async ({ value }) => {
      if (!R.isDeepEqual(value.deliveryOptions, deliveryOptions))
        await setDeliveryOptions({ options: value.deliveryOptions, roomId });
    },
  });

  return (
    <form
      className={cardStyles().base()}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await form.handleSubmit();
      }}
    >
      <CardHeader>
        <div className="flex justify-between gap-4">
          <CardTitle>Delivery Options</CardTitle>

          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.values.deliveryOptions,
            ]}
          >
            {([canSubmit, value]) => (
              <Button
                type="submit"
                isDisabled={!canSubmit || R.isDeepEqual(value, deliveryOptions)}
              >
                <Save className="mr-2 size-5" />
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>

        <CardDescription>
          Delivery options are the methods by which orders can be delivered and
          are displayed in the New Order form for customers.
        </CardDescription>

        <form.Subscribe selector={(state) => state.errors}>
          {(errors) => (
            <ul className="list-disc pl-6 pt-2">
              {errors.map((e, i) => (
                <li key={i} className="text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </form.Subscribe>
      </CardHeader>

      <form.Field name="deliveryOptions" mode="array">
        {({ state, removeValue, moveValue, pushValue, validate, setValue }) => (
          <>
            <CardContent>
              <ol className="space-y-4">
                {state.value.map((option, i) => (
                  <li
                    key={i}
                    className={cardStyles().base({
                      className:
                        "bg-muted/20 relative grid grid-cols-2 gap-2 p-4",
                    })}
                  >
                    <div className="absolute right-2.5 top-2.5 flex gap-2">
                      <IconButton
                        onPress={() => {
                          moveValue(i, i + 1);
                          void validate("blur");
                        }}
                        isDisabled={i === state.value.length - 1}
                        aria-label={`Move ${option.id} down`}
                      >
                        <ChevronDown />
                      </IconButton>

                      <IconButton
                        onPress={() => {
                          moveValue(i, i - 1);
                          void validate("blur");
                        }}
                        isDisabled={i === 0}
                        aria-label={`Move ${option.id} up`}
                      >
                        <ChevronUp />
                      </IconButton>

                      <IconButton
                        onPress={() =>
                          removeValue(i).then(() => void validate("blur"))
                        }
                        aria-label={`Remove ${option.id}`}
                      >
                        <X />
                      </IconButton>
                    </div>

                    <form.Field name={`deliveryOptions[${i}].id`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Name</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].description`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Description</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].detailsLabel`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Details Label</Label>

                          <Input
                            id={name}
                            value={state.value ?? ""}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].cost`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <NumberField
                          value={Number(state.value)}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          formatOptions={{
                            style: "currency",
                            currency: "USD",
                            currencyDisplay: "symbol",
                            currencySign: "standard",
                          }}
                          step={0.01}
                          minValue={0}
                        >
                          <Label htmlFor={name}>Cost</Label>

                          <FieldGroup>
                            <NumberFieldInput id={name} />

                            <NumberFieldSteppers />
                          </FieldGroup>
                        </NumberField>
                      )}
                    </form.Field>
                  </li>
                ))}
              </ol>
            </CardContent>

            <CardFooter className="justify-between">
              <FileTrigger
                acceptedFileTypes={["application/json"]}
                onSelect={(fileList) => {
                  if (fileList) {
                    const file = Array.from(fileList).at(0);

                    if (file) {
                      const reader = new FileReader();

                      reader.onload = async (e) => {
                        const text = e.target?.result;
                        if (typeof text !== "string") return;

                        let data: unknown;
                        try {
                          data = JSON.parse(text);
                        } catch (e) {
                          console.error(e);
                          return toast.error("Invalid JSON syntax.");
                        }

                        const result = v.safeParse(deliveryOptionsSchema, data);

                        if (!result.success) {
                          console.error(result.issues);
                          return toast.error("Invalid JSON schema.");
                        }

                        setValue(result.output);
                        return toast.success(
                          "Delivery options successfully imported.",
                        );
                      };

                      reader.onerror = console.error;

                      reader.readAsText(file);
                    }
                  }
                }}
              >
                <Button variant="outline">
                  <Import className="mr-2 size-5" />
                  Import
                </Button>
              </FileTrigger>

              <Button
                variant="secondary"
                onPress={() =>
                  pushValue({
                    id: "",
                    description: "",
                    detailsLabel: "",
                    cost: 0,
                  })
                }
              >
                <Plus className="mr-2 size-5" />
                Add
              </Button>
            </CardFooter>
          </>
        )}
      </form.Field>
    </form>
  );
}
