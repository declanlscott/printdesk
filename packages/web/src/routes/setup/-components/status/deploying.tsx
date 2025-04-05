import { SharedErrors } from "@printworks/core/errors/shared";

import { useSetupContext, useSetupStatusState } from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Deploying";

export function DeployingStatusItem() {
  const state = useSetupStatusState();
  const context = useSetupContext();

  switch (state) {
    case "initialize":
    case "register":
    case "dispatchInfra":
    case "waitForInfra":
      return <PendingItem name={name} />;
    case "healthcheck":
    case "waitForGoodHealth":
      return <PendingItem name={name} isActive />;
    case "configure":
    case "testPapercutConnection":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
        case "initialize":
        case "register":
        case "dispatchInfra":
        case "waitForInfra":
          return <PendingItem name={name} />;
        case "healthcheck":
        case "waitForGoodHealth":
          return <FailureItem name={name} isActive />;
        case "configure":
        case "testPapercutConnection":
          return <SuccessItem name={name} />;
        default:
          throw new SharedErrors.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new SharedErrors.NonExhaustiveValue(state);
  }
}
