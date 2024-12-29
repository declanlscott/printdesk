import { Outlet } from "@tanstack/react-router";

import { SideNav } from "~/app/components/ui/side-nav";

import type { ReactNode } from "react";
import type { ResolvedAppLink } from "~/app/types";

export type SettingsLayoutProps = {
  header?: ReactNode;
  links: Array<ResolvedAppLink>;
};
export function SettingsLayout(props: SettingsLayoutProps) {
  const {
    header = <h1 className="text-3xl font-semibold">Settings</h1>,
    links,
  } = props;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <header className="mx-auto grid w-full max-w-6xl gap-2">{header}</header>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <SideNav links={links} />

        <Outlet />
      </div>
    </div>
  );
}
