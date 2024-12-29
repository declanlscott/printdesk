import { Outlet } from "@tanstack/react-router";

import { useRealtime } from "~/lib/hooks/realtime";
import { useUser } from "~/lib/hooks/user";
import { CommandBarStore } from "~/lib/stores/command-bar";
import { MainNav } from "~/ui/main-nav";

export function AuthenticatedLayout() {
  const user = useUser();

  useRealtime(["/replicache/tenant", `/replicache/users/${user.id}`]);

  return (
    <CommandBarStore.Provider
      initial={{ input: "", pages: [{ type: "home" }] }}
    >
      <MainNav />

      <main className="bg-muted/40 min-h-[calc(100vh_-_theme(spacing.16))]">
        <Outlet />
      </main>
    </CommandBarStore.Provider>
  );
}
