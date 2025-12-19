import type { NavigateOptions, ToOptions } from "@tanstack/react-router";

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToOptions;
    routerOptions: Omit<NavigateOptions, keyof ToOptions>;
  }
}
