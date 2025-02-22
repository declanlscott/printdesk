import { handleEvent } from "@printworks/core/realtime/client";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useRealtimeChannel } from "~/lib/hooks/realtime";
import {
  useSetupContext,
  useSetupMachine,
  useSetupStatusState,
} from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Synchronizing";

export function SynchronizingStatusItem() {
  const state = useSetupStatusState();
  const { dispatchId, failureStatus } = useSetupContext();

  switch (state) {
    case "initialize":
    case "register":
    case "dispatchInfra":
    case "waitForInfra":
    case "healthcheck":
    case "determineHealth":
    case "waitForGoodHealth":
      return <PendingItem name={name} />;
    case "configure":
    case "dispatchSync":
    case "waitForSync":
      return dispatchId ? (
        <WaitForSync dispatchId={dispatchId} />
      ) : (
        <PendingItem name={name} isActive />
      );
    case "activate":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (failureStatus) {
        case null:
        case "initialize":
        case "register":
        case "dispatchInfra":
        case "waitForInfra":
        case "healthcheck":
        case "determineHealth":
        case "waitForGoodHealth":
          return <PendingItem name={name} />;
        case "configure":
        case "dispatchSync":
        case "waitForSync":
          return <FailureItem name={name} isActive />;
        case "activate":
          return <SuccessItem name={name} />;
        default:
          throw new ApplicationError.NonExhaustiveValue(failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}

function WaitForSync({ dispatchId }: { dispatchId: string }) {
  const actor = useSetupMachine().useActorRef();

  useRealtimeChannel(
    `/events/${dispatchId}`,
    handleEvent((event) => {
      if (event.type === "papercut-sync" && event.dispatchId === dispatchId) {
        if (event.success) return actor.send({ type: "status.activate" });

        if (!event.success) return actor.send({ type: "status.fail" });
      }
    }),
  );

  return <PendingItem name={name} isActive />;
}
