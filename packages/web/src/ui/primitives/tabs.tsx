import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  composeRenderProps,
} from "react-aria-components";

import { tabsStyles } from "~/styles/components/primitives/tabs";

import type { ComponentProps } from "react";
import type {
  TabListProps as AriaTabListProps,
  TabPanelProps as AriaTabPanelProps,
  TabProps as AriaTabProps,
  TabsProps as AriaTabsProps,
} from "react-aria-components";

export interface TabsProps
  extends AriaTabsProps,
    ComponentProps<typeof AriaTabs> {}
export const Tabs = ({ className, ...props }: TabsProps) => (
  <AriaTabs
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().root({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface TabListProps<TItem extends object>
  extends AriaTabListProps<TItem>,
    ComponentProps<typeof AriaTabList<TItem>> {}
export const TabList = <TItem extends object>({
  className,
  ...props
}: TabListProps<TItem>) => (
  <AriaTabList
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().list({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface TabProps
  extends AriaTabProps,
    ComponentProps<typeof AriaTab> {}
export const Tab = ({ className, ...props }: TabProps) => (
  <AriaTab
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().tab({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface TabPanelProps
  extends AriaTabPanelProps,
    ComponentProps<typeof AriaTabPanel> {}
export const TabPanel = ({ className, ...props }: TabPanelProps) => (
  <AriaTabPanel
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().panel({ className, ...renderProps }),
    )}
    {...props}
  />
);
