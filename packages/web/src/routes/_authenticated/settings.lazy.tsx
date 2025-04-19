import { createLazyFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "~/layouts/settings";
import { useNavLinks } from "~/lib/hooks/links";
import { useUser } from "~/lib/hooks/user";

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();

  const { settingsNav } = useNavLinks();

  return <SettingsLayout links={settingsNav[user.role]} />;
}
