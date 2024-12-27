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

import type { Room } from "@printworks/core/rooms/sql";
import type { DialogOverlayProps } from "~/app/components/ui/primitives/dialog";

export interface DeleteRoomDialogProps {
  roomId: Room["id"];
  dialogOverlayProps?: DialogOverlayProps;
}

export function DeleteRoomDialog(props: DeleteRoomDialogProps) {
  const roomToDelete = useSubscribe(query.room(props.roomId));

  const { deleteRoom } = useMutator();

  const targetConfirmationText = "delete";
  const [confirmationText, setConfirmationText] = useState(() => "");

  const isConfirmed = confirmationText === targetConfirmationText;

  async function mutate() {
    if (isConfirmed)
      await deleteRoom({
        id: props.roomId,
        deletedAt: new Date(),
      });
  }

  return (
    <DialogOverlay isDismissable={false} {...props.dialogOverlayProps}>
      <DialogContent dialogProps={{ role: "alertdialog" }}>
        {({ close }) => (
          <>
            <DialogHeader>
              <DialogTitle>Delete "{roomToDelete?.name}"?</DialogTitle>

              <p className="text-muted-foreground text-sm">
                Are you sure you want to continue? This action may be disruptive
                for users of this room.
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
                isDisabled={!isConfirmed}
                onPress={() =>
                  mutate().then(() => {
                    close();
                    setConfirmationText("");
                  })
                }
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
