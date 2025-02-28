import { ApplicationError } from "@printworks/core/utils/errors";

import { useSetupContext, useSetupStatusState } from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Initializing";

export function InitializingStatusItem() {
  const state = useSetupStatusState();
  const context = useSetupContext();

  switch (state) {
    case "initialize":
      return <PendingItem name={name} isActive />;
    case "register":
    case "dispatchInfra":
    case "waitForInfra":
    case "healthcheck":
    case "determineHealth":
    case "waitForGoodHealth":
    case "configure":
    case "testPapercutConnection":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
          return <PendingItem name={name} />;
        case "initialize":
          return <FailureItem name={name} isActive />;
        case "register":
        case "dispatchInfra":
        case "waitForInfra":
        case "healthcheck":
        case "determineHealth":
        case "waitForGoodHealth":
        case "configure":
        case "testPapercutConnection":
          return <SuccessItem name={name} />;
        default:
          throw new ApplicationError.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}
