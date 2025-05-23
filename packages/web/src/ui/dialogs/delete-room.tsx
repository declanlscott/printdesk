import { useState } from "react";
import { Rooms } from "@printdesk/core/rooms/client";

import { useMutators, useSubscribe } from "~/lib/hooks/replicache";
import { Button } from "~/ui/primitives/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "~/ui/primitives/dialog";
import { TextField } from "~/ui/primitives/text-field";

import type { Room } from "@printdesk/core/rooms/sql";
import type { DialogOverlayProps } from "~/ui/primitives/dialog";

export interface DeleteRoomDialogProps {
  roomId: Room["id"];
  dialogOverlayProps?: DialogOverlayProps;
}

export function DeleteRoomDialog(props: DeleteRoomDialogProps) {
  const roomToDelete = useSubscribe(Rooms.byId(props.roomId));

  const { deleteRoom } = useMutators();

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
              <TextField
                labelProps={{ children: "Confirm" }}
                inputProps={{
                  placeholder: targetConfirmationText,
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
