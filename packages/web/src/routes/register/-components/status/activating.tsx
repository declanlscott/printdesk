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

const name = "Activating";

export function ActivatingStatusItem() {
  const state = useRegistrationStatusState();
  const context = useRegistrationContext();

  switch (state) {
    case "register":
    case "waitForInfra":
    case "waitForGoodHealth":
    case "healthcheck":
    case "determineHealth":
    case "initialize":
    case "waitForSync":
      return <PendingItem name={name} />;
    case "activate":
      return <PendingItem name={name} isActive />;
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
        case "initialize":
        case "waitForSync":
          return <PendingItem name={name} />;
        case "activate":
          return <FailureItem name={name} isActive />;
        default:
          throw new ApplicationError.NonExhaustiveValue(context.failureStatus);
      }
    default:
      throw new ApplicationError.NonExhaustiveValue(state);
  }
}
