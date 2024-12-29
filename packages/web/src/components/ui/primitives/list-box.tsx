import {
  Collection as AriaCollection,
  Header as AriaHeader,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  ListBoxSection as AriaListBoxSection,
  composeRenderProps,
} from "react-aria-components";
import { Check } from "lucide-react";

import { listBoxStyles } from "~/styles/components/primitives/list-box";

import type { ComponentProps } from "react";
import type {
  ListBoxItemProps as AriaListBoxItemProps,
  ListBoxProps as AriaListBoxProps,
} from "react-aria-components";

export const ListBoxSection = AriaListBoxSection;

export const ListBoxCollection = AriaCollection;

export type ListBoxProps<TItem extends object> = AriaListBoxProps<TItem> &
  ComponentProps<typeof AriaListBox>;
export const ListBox = <TItem extends object>({
  className,
  ...props
}: ListBoxProps<TItem>) => (
  <AriaListBox
    className={composeRenderProps(className, (className, renderProps) =>
      listBoxStyles().root({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ListBoxItemProps<T extends object> = AriaListBoxItemProps<T> &
  ComponentProps<typeof AriaListBoxItem>;
export const ListBoxItem = <T extends object>({
  className,
  children,
  ...props
}: ListBoxItemProps<T>) => (
  <AriaListBoxItem
    textValue={
      props.textValue ?? (typeof children === "string" ? children : undefined)
    }
    className={composeRenderProps(className, (className, renderProps) =>
      listBoxStyles().item({ className, ...renderProps }),
    )}
    {...props}
  >
    {composeRenderProps(children, (children, renderProps) => (
      <>
        {renderProps.isSelected && (
          <span className="absolute left-2 flex size-4 items-center justify-center">
            <Check className="size-4" />
          </span>
        )}
        {children}
      </>
    ))}
  </AriaListBoxItem>
);

export type ListBoxHeaderProps = ComponentProps<typeof AriaHeader>;
export const ListBoxHeader = ({ className, ...props }: ListBoxHeaderProps) => (
  <AriaHeader className={listBoxStyles().header({ className })} {...props} />
);
