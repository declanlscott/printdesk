import { handleEvent } from "@printworks/core/realtime/client";
import { ApplicationError } from "@printworks/core/utils/errors";

import { useRealtimeChannel } from "~/lib/hooks/realtime";
import { useSetupMachine, useSetupStatusState } from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Provisioning";

export function ProvisioningStatusItem() {
  const state = useSetupStatusState();
  const { dispatchId, failureStatus } = useSetupMachine().useSelector(
    ({ context }) => ({
      dispatchId: context.dispatchId,
      failureStatus: context.failureStatus,
    }),
  );

  switch (state) {
    case "initialize":
    case "register":
      return <PendingItem name={name} />;
    case "dispatchInfra":
    case "waitForInfra":
      return dispatchId ? (
        <WaitForInfra dispatchId={dispatchId} />
      ) : (
        <PendingItem name={name} isActive />
      );
    case "healthcheck":
    case "determineHealth":
    case "waitForGoodHealth":
    case "configure":
    case "dispatchSync":
    case "waitForSync":
    case "activate":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (failureStatus) {
        case null:
        case "initialize":
        case "register":
          return <PendingItem name={name} />;
        case "dispatchInfra":
        case "waitForInfra":
          return <FailureItem name={name} isActive />;
        case "healthcheck":
        case "determineHealth":
        case "waitForGoodHealth":
        case "configure":
        case "dispatchSync":
        case "waitForSync":
        case "activate":
          return <SuccessItem name={name} />;
        default:
          throw new ApplicationError.NonExhaustiveValue(failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}

function WaitForInfra({ dispatchId }: { dispatchId: string }) {
  const actor = useSetupMachine().useActorRef();

  useRealtimeChannel(
    `/events/${dispatchId}`,
    handleEvent((event) => {
      if (event.type === "infra" && event.dispatchId === dispatchId) {
        if (event.success) return actor.send({ type: "status.healthcheck" });

        if (!event.success)
          return event.retrying
            ? console.log("Provisioning failed, retrying ...")
            : actor.send({ type: "status.fail" });
      }
    }),
  );

  return <PendingItem name={name} isActive />;
}
