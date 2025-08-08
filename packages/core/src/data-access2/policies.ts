import { Effect } from "effect";

import { DataAccess } from ".";
import {
  hasActiveBillingAccountAuthorization,
  hasActiveBillingAccountCustomerAuthorization,
  hasActiveBillingAccountManagerAuthorization,
} from "../billing-accounts2/shared";
import { isCommentAuthor } from "../comments2/shared";
import {
  canApproveOrder,
  canDeleteOrder,
  canEditOrder,
  canTransitionOrder,
  hasActiveOrderBillingAccountManagerAuthorization,
  isOrderCustomer,
  isOrderCustomerOrManager,
  isOrderManager,
} from "../orders2/shared";
import {
  isLicenseAvailable,
  isTenantSubdomainAvailable,
} from "../tenants2/shared";
import { isUserSelf } from "../users2/shared";

export class Policies extends Effect.Service<Policies>()(
  "@printdesk/core/data-access/Policies",
  {
    accessors: true,
    succeed: {
      client: new DataAccess.PolicyClient()
        .register(hasActiveBillingAccountManagerAuthorization)
        .register(hasActiveBillingAccountCustomerAuthorization)
        .register(hasActiveBillingAccountAuthorization)
        .register(isCommentAuthor)
        .register(isOrderCustomer)
        .register(isOrderManager)
        .register(isOrderCustomerOrManager)
        .register(hasActiveOrderBillingAccountManagerAuthorization)
        .register(canEditOrder)
        .register(canApproveOrder)
        .register(canTransitionOrder)
        .register(canDeleteOrder)
        .register(isTenantSubdomainAvailable)
        .register(isLicenseAvailable)
        .register(isUserSelf),
    },
  },
) {}
