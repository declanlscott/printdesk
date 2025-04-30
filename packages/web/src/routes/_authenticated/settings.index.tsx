import { useState } from "react";
import { tenantStatuses } from "@printdesk/core/tenants/shared";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen, Pencil, UserRoundX } from "lucide-react";

import { useMutators } from "~/lib/hooks/replicache";
import { useTenant } from "~/lib/hooks/tenant";
import { useUser } from "~/lib/hooks/user";
import { collectionItem, onSelectionChange } from "~/lib/ui";
import { labelStyles } from "~/styles/components/primitives/field";
import { EnforceAbac } from "~/ui/access-control";
import { DeleteUserDialog } from "~/ui/dialogs/delete-user";
import { Button } from "~/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/ui/primitives/card";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "~/ui/primitives/dialog";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
} from "~/ui/primitives/select";
import { TextField } from "~/ui/primitives/text-field";
import { Toggle } from "~/ui/primitives/toggle";

import type { TenantStatus } from "@printdesk/core/tenants/shared";

const routeId = "/_authenticated/settings/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) => context.authorizeRoute(routeId),
  head: () => ({ meta: [{ title: "Settings | Printdesk" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid gap-6">
      <EnforceAbac resource="tenants" action="update" input={[]}>
        <OrganizationCard />
      </EnforceAbac>

      <DangerZoneCard />
    </div>
  );
}

function OrganizationCard() {
  const tenant = useTenant();

  const [isLocked, setIsLocked] = useState(() => true);

  const [name, setName] = useState(() => tenant.name);
  const [subdomain, setSubdomain] = useState(() => tenant.subdomain);

  const { updateTenant } = useMutators();

  async function mutateName() {
    const trimmed = name.trim();
    if (trimmed === tenant.name) return;

    await updateTenant({
      id: tenant.id,
      name: trimmed,
      updatedAt: new Date(),
    });
  }

  async function mutateSubdomain() {
    const trimmed = subdomain?.trim();
    if (trimmed === tenant.subdomain) return;

    await updateTenant({
      id: tenant.id,
      subdomain: trimmed,
      updatedAt: new Date(),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Organization</CardTitle>

          <CardDescription>
            Edit your organization's full and short names. The short name must
            be globally unique.
          </CardDescription>
        </div>

        <Toggle onPress={() => setIsLocked((isLocked) => !isLocked)}>
          {({ isHovered }) =>
            isLocked ? (
              isHovered ? (
                <LockOpen className="size-5" />
              ) : (
                <Lock className="size-5" />
              )
            ) : isHovered ? (
              <Lock className="size-5" />
            ) : (
              <LockOpen className="size-5" />
            )
          }
        </Toggle>
      </CardHeader>

      <CardContent className="space-y-4">
        <TextField
          labelProps={{ children: "Name" }}
          inputProps={{
            disabled: isLocked,
            value: name ?? "",
            onChange: (e) => setName(e.target.value),
            onBlur: void mutateName,
          }}
        />

        <TextField
          labelProps={{ children: "Subdomain" }}
          inputProps={{
            disabled: isLocked,
            value: subdomain ?? "",
            onChange: (e) => setSubdomain(e.target.value),
            onBlur: void mutateSubdomain,
          }}
        />
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <DeleteAccount />

        <EnforceAbac resource="tenants" action="update" input={[]}>
          <TenantStatusSelect />
        </EnforceAbac>
      </CardContent>
    </Card>
  );
}

function DeleteAccount() {
  const user = useUser();

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Delete User Account</span>

        <CardDescription>Delete your user account.</CardDescription>
      </div>

      <DialogTrigger>
        <Button variant="destructive">
          <UserRoundX className="mr-2 size-5" />
          Delete Account
        </Button>

        <DeleteUserDialog userId={user.id} />
      </DialogTrigger>
    </div>
  );
}

function TenantStatusSelect() {
  const tenant = useTenant();

  const { updateTenant } = useMutators();

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(
    () => false,
  );

  const [confirmationText, setConfirmationText] = useState(() => "");

  const isConfirmed = confirmationText === tenant.name;

  async function mutate(status: TenantStatus) {
    if (status === "setup") return;
    if (status === tenant.status) return;

    await updateTenant({
      id: tenant.id,
      status,
      updatedAt: new Date(),
    });
  }

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Status</span>

        <CardDescription>{`This organization is currently "${tenant.status}".`}</CardDescription>
      </div>

      <Select
        aria-label="status"
        selectedKey={tenant.status}
        onSelectionChange={onSelectionChange(tenantStatuses, (status) => {
          if (status === "active") return mutate("active");

          if (status === "suspended" && tenant.status !== "suspended")
            return setIsConfirmationDialogOpen(true);
        })}
      >
        <Button variant="destructive">
          <Pencil className="mr-2 size-5" />
          Change Status
        </Button>

        <SelectPopover>
          <SelectListBox
            items={tenantStatuses
              .filter((status) => status !== "setup")
              .map(collectionItem)}
          >
            {(item) => (
              <SelectItem
                id={item.name}
                textValue={item.name}
                className="capitalize"
              >
                {item.name}
              </SelectItem>
            )}
          </SelectListBox>
        </SelectPopover>
      </Select>

      <DialogOverlay
        isDismissable={false}
        isOpen={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <DialogContent dialogProps={{ role: "alertdialog" }}>
          {({ close }) => (
            <>
              <DialogHeader>
                <DialogTitle>Suspend "{tenant.name}"?</DialogTitle>

                <p className="text-muted-foreground text-sm">
                  Are you sure you want to continue? This action may be
                  disruptive for your users.
                </p>

                <p className="text-muted-foreground text-sm">
                  To confirm suspending, enter the full name of your
                  organization in the text field below.
                </p>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <TextField
                  labelProps={{ children: "Full Name" }}
                  inputProps={{
                    placeholder: tenant.name,
                    value: confirmationText,
                    onChange: (e) => setConfirmationText(e.target.value),
                  }}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  autoFocus
                  onPress={() => {
                    close();
                    setConfirmationText("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  onPress={() =>
                    mutate("suspended").then(() => {
                      close();
                      setConfirmationText("");
                    })
                  }
                  isDisabled={!isConfirmed}
                >
                  Suspend
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </DialogOverlay>
    </div>
  );
}
