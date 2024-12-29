import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  composeRenderProps,
} from "react-aria-components";

import { tabsStyles } from "~/styles/components/primitives/tabs";

import type { ComponentProps } from "react";
import type { TabListProps as AriaTabListProps } from "react-aria-components";

export type TabsProps = ComponentProps<typeof AriaTabs>;
export const Tabs = ({ className, ...props }: TabsProps) => (
  <AriaTabs
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().root({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type TabListProps<TItem extends object> = AriaTabListProps<TItem> &
  ComponentProps<typeof AriaTabList>;
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

export type TabProps = ComponentProps<typeof AriaTab>;
export const Tab = ({ className, ...props }: TabProps) => (
  <AriaTab
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().tab({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type TabPanelProps = ComponentProps<typeof AriaTabPanel>;
export const TabPanel = ({ className, ...props }: TabPanelProps) => (
  <AriaTabPanel
    className={composeRenderProps(className, (className, renderProps) =>
      tabsStyles().panel({ className, ...renderProps }),
    )}
    {...props}
  />
);
