import { handleEvent } from "@printworks/core/realtime/client";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useRealtimeChannel } from "~/lib/hooks/realtime";
import {
  useRegistrationContext,
  useRegistrationMachine,
  useRegistrationStatusState,
} from "~/lib/hooks/registration";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/register/-components/status/items";

const name = "Initializing";

export function InitializingStatusItem() {
  const state = useRegistrationStatusState();
  const context = useRegistrationContext();

  switch (state) {
    case "register":
    case "waitForInfra":
    case "waitForGoodHealth":
    case "healthcheck":
    case "determineHealth":
      return <PendingItem name={name} />;
    case "initialize":
    case "waitForSync":
      return context.dispatchId ? (
        <WaitForSync dispatchId={context.dispatchId} />
      ) : (
        <PendingItem name={name} isActive />
      );
    case "activate":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
        case "register":
        case "waitForInfra":
        case "waitForGoodHealth":
        case "healthcheck":
        case "determineHealth":
          return <PendingItem name={name} />;
        case "initialize":
        case "waitForSync":
          return <FailureItem name={name} isActive />;
        case "activate":
          return <SuccessItem name={name} />;
        default:
          throw new ApplicationError.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}

function WaitForSync({ dispatchId }: { dispatchId: string }) {
  const actor = useRegistrationMachine().useActorRef();

  useRealtimeChannel(
    `/events/${dispatchId}`,
    handleEvent((event) => {
      if (event.type === "papercut-sync") {
        if (event.success && event.dispatchId === dispatchId)
          return actor.send({ type: "status.activate" });

        if (!event.success) return actor.send({ type: "status.fail" });
      }
    }),
  );

  return <PendingItem name={name} isActive />;
}
