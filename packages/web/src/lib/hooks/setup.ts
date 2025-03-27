import { useRouteApi } from "~/lib/hooks/route-api";

export const useSetupMachine = () =>
  useRouteApi("/setup/").useLoaderData().SetupMachineContext;

export const useSetupState = () =>
  useSetupMachine().useSelector(({ value }) => value);

export const useSetupContext = () =>
  useSetupMachine().useSelector(({ context }) => context);

export function useSetupWizardState() {
  const state = useSetupState();
  const stateName = "wizard";

  if (!(stateName in state))
    throw new Error(`Invalid setup state, expected ${stateName}`);

  return state.wizard;
}

export function useSetupStatusState() {
  const state = useSetupState();
  const stateName = "status";

  if (!(stateName in state))
    throw new Error(`Invalid setup state, expected ${stateName}`);

  return state.status;
}
