import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";

import { Button } from "~/app/components/ui/primitives/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/text-field";
import { query, useMutator } from "~/app/lib/hooks/data";
import { useSubscribe } from "~/app/lib/hooks/replicache";
import { useUser } from "~/app/lib/hooks/user";

import type { User } from "@printworks/core/users/sql";
import type { DialogOverlayProps } from "~/app/components/ui/primitives/dialog";

export interface DeleteUserDialogProps {
  userId: User["id"];
  dialogOverlayProps?: DialogOverlayProps;
}

export function DeleteUserDialog(props: DeleteUserDialogProps) {
  const user = useUser();

  const userToDelete = useSubscribe(query.user(props.userId));

  const isSelf = user?.id === props.userId;

  const { deleteUserProfile } = useMutator();

  const targetConfirmationText = "delete";
  const [confirmationText, setConfirmationText] = useState(() => "");

  const isConfirmed = confirmationText === targetConfirmationText;

  async function mutate() {
    if (isConfirmed) {
      await deleteUserProfile({
        id: props.userId,
        deletedAt: new Date(),
      });
    }
  }

  return (
    <DialogOverlay isDismissable={false} {...props.dialogOverlayProps}>
      <DialogContent dialogProps={{ role: "alertdialog" }}>
        {({ close }) => (
          <>
            <DialogHeader>
              <DialogTitle>
                {isSelf
                  ? "Delete Account"
                  : `Delete "${userToDelete?.profile.name}"`}
                ?
              </DialogTitle>

              <p className="text-muted-foreground text-sm">
                Are you sure you want to continue?{" "}
                {isSelf ? "You" : `${userToDelete?.profile.name}`} will not be
                able to access {isSelf ? "your" : "their"} account after
                deletion.
              </p>

              <p className="text-muted-foreground text-sm">
                This action can be undone by an administrator.
              </p>

              <p className="text-muted-foreground text-sm">
                To confirm deletion, enter "{targetConfirmationText}" in the
                text field below.
              </p>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <AriaTextField>
                <Label>Confirm</Label>

                <Input
                  placeholder={targetConfirmationText}
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                />
              </AriaTextField>
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
                variant="destructive"
                onPress={() =>
                  mutate().then(() => {
                    close();
                    setConfirmationText("");
                  })
                }
                isDisabled={!isConfirmed}
              >
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </DialogOverlay>
  );
}
