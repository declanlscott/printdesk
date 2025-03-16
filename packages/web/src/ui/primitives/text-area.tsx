import {
  TextArea as AriaTextArea,
  composeRenderProps,
} from "react-aria-components";

import { textAreaStyles } from "~/styles/components/primitives/text-area";

import type { TextAreaProps as AriaTextAreaProps } from "react-aria-components";
import type { TextAreaStyles } from "~/styles/components/primitives/text-area";

export type TextAreaProps = AriaTextAreaProps & TextAreaStyles;

export const TextArea = ({ className, ...props }: TextAreaProps) => (
  <AriaTextArea
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      textAreaStyles({ className, ...renderProps }),
    )}
  />
);
