import type { PropsWithChildren } from "react";

export type KeyboardShortcutProps = PropsWithChildren;

export const KeyboardShortcut = (props: PropsWithChildren) => (
  <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium opacity-100 md:flex">
    {props.children}
  </kbd>
);
