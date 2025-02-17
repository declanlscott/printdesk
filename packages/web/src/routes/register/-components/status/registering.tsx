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

const name = "Registering";

export function RegisteringStatusItem() {
  const state = useRegistrationStatusState();
  const context = useRegistrationContext();

  switch (state) {
    case "register":
      return <PendingItem name={name} isActive />;
    case "waitForInfra":
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
          return <PendingItem name={name} />;
        case "register":
          return <FailureItem name={name} isActive />;
        case "waitForInfra":
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
