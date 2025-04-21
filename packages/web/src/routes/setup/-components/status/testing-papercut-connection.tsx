import { SharedErrors } from "@printdesk/core/errors/shared";

import { useSetupContext, useSetupStatusState } from "~/lib/hooks/setup";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/setup/-components/status/items";

const name = "Testing PaperCut Connection";

export function TestingPapercutConnectionStatusItem() {
  const state = useSetupStatusState();
  const context = useSetupContext();

  switch (state) {
    case "initialize":
    case "register":
    case "dispatchInfra":
    case "waitForInfra":
    case "healthcheck":
    case "waitForGoodHealth":
    case "configure":
      return <PendingItem name={name} />;
    case "testPapercutConnection":
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
        case "waitForGoodHealth":
        case "configure":
          return <PendingItem name={name} />;
        case "testPapercutConnection":
          return <FailureItem name={name} isActive />;
        default:
          throw new SharedErrors.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new SharedErrors.NonExhaustiveValue(state);
  }
}
