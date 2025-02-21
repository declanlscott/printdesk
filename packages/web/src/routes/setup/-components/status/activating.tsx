import { ApplicationError } from "@printworks/core/utils/errors";

import { useSetupContext, useSetupStatusState } from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Activating";

export function ActivatingStatusItem() {
  const state = useSetupStatusState();
  const context = useSetupContext();

  switch (state) {
    case "initialize":
    case "register":
    case "dispatchInfra":
    case "waitForInfra":
    case "healthcheck":
    case "determineHealth":
    case "waitForGoodHealth":
    case "dispatchSync":
    case "waitForSync":
      return <PendingItem name={name} />;
    case "activate":
      return <PendingItem name={name} isActive />;
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
        case "initialize":
        case "register":
        case "dispatchInfra":
        case "waitForInfra":
        case "healthcheck":
        case "determineHealth":
        case "waitForGoodHealth":
        case "dispatchSync":
          return <PendingItem name={name} />;
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
