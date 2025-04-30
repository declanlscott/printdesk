import { SharedErrors } from "@printdesk/core/errors/shared";
import { Realtime } from "@printdesk/core/realtime/client";

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
  const { dispatchId, realtimeAuth, failureStatus } =
    useSetupMachine().useSelector(({ context }) => ({
      dispatchId: context.dispatchId,
      realtimeAuth: context.realtimeAuth,
      failureStatus: context.failureStatus,
    }));

  switch (state) {
    case "initialize":
    case "register":
      return <PendingItem name={name} />;
    case "dispatchInfra":
    case "waitForInfra":
      return dispatchId && realtimeAuth ? (
        <WaitForInfra dispatchId={dispatchId} realtimeAuth={realtimeAuth} />
      ) : (
        <PendingItem name={name} isActive />
      );
    case "healthcheck":
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

type WaitForInfraProps = {
  dispatchId: string;
  realtimeAuth: Record<string, string>;
};

function WaitForInfra(props: WaitForInfraProps) {
  const actor = useSetupMachine().useActorRef();

  useRealtimeChannel(
    `/events/${props.dispatchId}`,
    Realtime.handleEvent((event) => {
      if (
        event.kind === "infra_provision_result" &&
        event.dispatchId === props.dispatchId
      ) {
        if (event.success) return actor.send({ type: "status.healthcheck" });

        if (!event.success)
          return event.retrying
            ? console.log("Provisioning failed, retrying ...")
            : actor.send({ type: "status.fail" });
      }
    }),
    props.realtimeAuth,
  );

  return <PendingItem name={name} isActive />;
}
