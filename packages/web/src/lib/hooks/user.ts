import { useMemo } from "react";
import { BillingAccounts } from "@printdesk/core/billing-accounts/client";
import { SharedErrors } from "@printdesk/core/errors/shared";
import { Users } from "@printdesk/core/users/client";
import * as R from "remeda";

import { useUserSubject } from "~/lib/hooks/auth";
import { useSubscribe } from "~/lib/hooks/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";

export function useUser() {
  const { initialUser } = useRouteApi("/_authenticated").useLoaderData();

  return useSubscribe(Users.byId(useUserSubject().id), {
    defaultData: initialUser,
  });
}

export function useManager() {
  const user = useUser();

  if (user.role !== "manager") throw new SharedErrors.AccessDenied();

  const managerAuthorizations = useSubscribe(
    BillingAccounts.allManagerAuthorizations(),
  );

  const billingAccountIds = useMemo(
    () =>
      R.pipe(
        managerAuthorizations ?? [],
        R.filter((authorization) => authorization.managerId === user.id),
        R.map(R.prop("billingAccountId")),
      ),
    [managerAuthorizations, user.id],
  );

  const customerAuthorizations = useSubscribe(
    BillingAccounts.allCustomerAuthorizations(),
  );

  const customerIds = useMemo(
    () =>
      R.pipe(
        customerAuthorizations ?? [],
        R.filter((authorization) =>
          billingAccountIds.includes(authorization.billingAccountId),
        ),
        R.map(R.prop("customerId")),
      ),
    [billingAccountIds, customerAuthorizations],
  );

  return { billingAccountIds, customerIds };
}
