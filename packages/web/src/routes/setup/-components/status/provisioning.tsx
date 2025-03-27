import { SharedErrors } from "@printworks/core/errors/shared";
import { Realtime } from "@printworks/core/realtime/client";

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
    case "testPapercutConnection":
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
        case "testPapercutConnection":
          return <SuccessItem name={name} />;
        default:
          throw new SharedErrors.NonExhaustiveValue(failureStatus);
      }
    default:
      throw new SharedErrors.NonExhaustiveValue(state);
  }
}

function WaitForInfra({ dispatchId }: { dispatchId: string }) {
  const actor = useSetupMachine().useActorRef();

  useRealtimeChannel(
    `/events/${dispatchId}`,
    Realtime.handleEvent((event) => {
      if (event.kind === "infra" && event.dispatchId === dispatchId) {
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
