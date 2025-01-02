import { createLazyFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "~/layouts/settings";
import { useUser } from "~/lib/hooks/user";
import { links } from "~/lib/links";

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();

  return <SettingsLayout links={links.settings()[user.profile.role]} />;
}
