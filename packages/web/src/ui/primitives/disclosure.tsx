import { useContext } from "react";
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosureGroup as AriaDisclosureGroup,
  DisclosurePanel as AriaDisclosurePanel,
  Heading as AriaHeading,
  composeRenderProps,
  DisclosureGroupStateContext,
} from "react-aria-components";
import { ChevronDownIcon } from "lucide-react";

import {
  disclosureGroupStyles,
  disclosureHeaderStyles,
  disclosurePanelStyles,
  disclosureStyles,
} from "~/styles/components/primitives/disclosure";

import type { PropsWithChildren } from "react";
import type {
  ButtonProps as AriaButtonProps,
  DisclosureGroupProps as AriaDisclosureGroupProps,
  DisclosurePanelProps as AriaDisclosurePanelProps,
  DisclosureProps as AriaDisclosureProps,
} from "react-aria-components";
import type {
  DisclosureHeaderStyles,
  DisclosureStyles,
} from "~/styles/components/primitives/disclosure";

export type DisclosureProps = AriaDisclosureProps & DisclosureStyles;
export function Disclosure({ children, className, ...props }: DisclosureProps) {
  const isInGroup = useContext(DisclosureGroupStateContext) !== null;

  return (
    <AriaDisclosure
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        disclosureStyles({ className, isInGroup, ...renderProps }),
      )}
    >
      {children}
    </AriaDisclosure>
  );
}

export type DisclosureHeaderProps = PropsWithChildren<AriaButtonProps> &
  DisclosureHeaderStyles;
export const DisclosureHeader = ({
  children,
  className,
}: DisclosureHeaderProps) => (
  <AriaHeading className="flex">
    <AriaButton
      slot="trigger"
      className={composeRenderProps(className, (className, renderProps) =>
        disclosureHeaderStyles({ className, ...renderProps }),
      )}
    >
      {children}

      <ChevronDownIcon
        aria-hidden
        className="size-4 shrink-0 transition-transform duration-200 group-data-[expanded]:rotate-180 group-data-[disabled]:opacity-50"
      />
    </AriaButton>
  </AriaHeading>
);

export type DisclosurePanelProps = AriaDisclosurePanelProps;
export const DisclosurePanel = ({
  children,
  className,
  ...props
}: DisclosurePanelProps) => (
  <AriaDisclosurePanel
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      disclosurePanelStyles({ className, ...renderProps }),
    )}
  >
    {children}
  </AriaDisclosurePanel>
);

export type DisclosureGroupProps = AriaDisclosureGroupProps;
export const DisclosureGroup = ({
  children,
  className,
  ...props
}: DisclosureGroupProps) => (
  <AriaDisclosureGroup
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      disclosureGroupStyles({ className, ...renderProps }),
    )}
  >
    {children}
  </AriaDisclosureGroup>
);
