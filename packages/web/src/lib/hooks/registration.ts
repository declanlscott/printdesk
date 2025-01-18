import { ApplicationError } from "@printworks/core/utils/errors";

import { useRouteApi } from "~/lib/hooks/route-api";

export const useRegistrationMachine = () =>
  useRouteApi("/register/").useLoaderData().RegistrationMachineContext;

export const useRegistrationState = () =>
  useRegistrationMachine().useSelector(({ value }) => value);

export function useRegistrationWizardState() {
  const state = useRegistrationState();
  const stateName = "wizard";

  if (!(stateName in state))
    throw new ApplicationError.Error(
      `Invalid registration state, expected ${stateName}`,
    );

  return state.wizard;
}

export function useRegistrationStatusState() {
  const state = useRegistrationState();
  const stateName = "status";

  if (!(stateName in state))
    throw new ApplicationError.Error(
      `Invalid registration state, expected ${stateName}`,
    );

  return state.status;
}
