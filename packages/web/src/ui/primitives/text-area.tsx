import {
  TextArea as AriaTextArea,
  composeRenderProps,
} from "react-aria-components";

import { textAreaStyles } from "~/styles/components/primitives/text-area";

import type { ComponentProps } from "react";
import type { TextAreaProps as AriaTextAreaProps } from "react-aria-components";
import type { TextAreaStyles } from "~/styles/components/primitives/text-area";

export interface TextAreaProps
  extends AriaTextAreaProps,
    ComponentProps<typeof AriaTextArea>,
    TextAreaStyles {}

export const TextArea = ({ className, ...props }: AriaTextAreaProps) => (
  <AriaTextArea
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      textAreaStyles({ className, ...renderProps }),
    )}
  />
);
