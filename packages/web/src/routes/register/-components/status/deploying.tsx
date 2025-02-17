import { ApplicationError } from "@printworks/core/utils/errors";

import {
  useRegistrationContext,
  useRegistrationStatusState,
} from "~/lib/hooks/registration";
import {
  FailureItem,
  PendingItem,
  SuccessItem,
} from "~/routes/register/-components/status/items";

const name = "Deploying";

export function DeployingStatusItem() {
  const state = useRegistrationStatusState();
  const context = useRegistrationContext();

  switch (state) {
    case "register":
    case "waitForInfra":
      return <PendingItem name={name} />;
    case "waitForGoodHealth":
    case "healthcheck":
    case "determineHealth":
      return <PendingItem name={name} isActive />;
    case "initialize":
    case "waitForSync":
    case "activate":
    case "complete":
      return <SuccessItem name={name} />;
    case "failure":
      switch (context.failureStatus) {
        case null:
        case "register":
        case "waitForInfra":
          return <PendingItem name={name} />;
        case "waitForGoodHealth":
        case "healthcheck":
        case "determineHealth":
          return <FailureItem name={name} isActive />;
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
