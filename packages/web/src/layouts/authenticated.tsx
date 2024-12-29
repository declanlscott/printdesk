import { Outlet } from "@tanstack/react-router";

import { CommandBarProvider } from "~/app/components/providers/command-bar";
import { MainNav } from "~/app/components/ui/main-nav";
import { useRealtime } from "~/app/lib/hooks/realtime";
import { useUser } from "~/app/lib/hooks/user";

export function AuthenticatedLayout() {
  const user = useUser();

  useRealtime(["/replicache/tenant", `/replicache/users/${user.id}`]);

  return (
    <CommandBarProvider>
      <MainNav />

      <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
        <Outlet />
      </main>
    </CommandBarProvider>
  );
}
