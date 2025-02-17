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

const name = "Provisioning";

export function ProvisioningStatusItem() {
  const state = useRegistrationStatusState();
  const context = useRegistrationContext();

  switch (state) {
    case "register":
      return <PendingItem name={name} />;
    case "waitForInfra":
      return context.dispatchId ? (
        <WaitForInfra dispatchId={context.dispatchId} />
      ) : (
        <PendingItem name={name} isActive />
      );
    case "waitForGoodHealth":
    case "healthcheck":
    case "determineHealth":
    case "initialize":
    case "waitForSync":
    case "activate":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
        case "register":
          return <PendingItem name={name} />;
        case "waitForInfra":
          return <FailureItem name={name} isActive />;
        case "waitForGoodHealth":
        case "healthcheck":
        case "determineHealth":
        case "initialize":
        case "waitForSync":
        case "activate":
          return <SuccessItem name={name} />;
        default:
          throw new ApplicationError.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}

function WaitForInfra({ dispatchId }: { dispatchId: string }) {
  const actor = useRegistrationMachine().useActorRef();

  useRealtimeChannel(
    `/events/${dispatchId}`,
    handleEvent((event) => {
      if (event.type === "infra") {
        if (event.success && event.dispatchId === dispatchId)
          return actor.send({ type: "status.healthcheck" });

        if (!event.success && !event.retrying)
          return actor.send({ type: "status.fail" });
      }
    }),
  );

  return <PendingItem name={name} isActive />;
}
