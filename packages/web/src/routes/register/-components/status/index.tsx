import { PropsWithChildren } from "react";

import {
  useRegistrationMachine,
  useRegistrationStatusState,
} from "~/lib/hooks/registration";

export function RegistrationStatus(props: PropsWithChildren) {
  const state = useRegistrationStatusState();
  const slug = useRegistrationMachine().useSelector(
    ({ context }) => context.tenantSlug,
  );

  return null;
}
