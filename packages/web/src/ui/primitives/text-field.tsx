import {
  Input as AriaInput,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  composeRenderProps,
} from "react-aria-components";

import {
  inputStyles,
  textAreaStyles,
} from "~/styles/components/primitives/text-field";

import type { ComponentProps } from "react";
import type {
  InputStyles,
  TextAreaStyles,
} from "~/styles/components/primitives/text-field";

export const TextField = AriaTextField;

export type InputProps = ComponentProps<typeof AriaInput> & InputStyles;
export const Input = ({ className, ...props }: InputProps) => (
  <AriaInput
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      inputStyles({ className, ...renderProps }),
    )}
  />
);

export type TextAreaProps = ComponentProps<typeof AriaTextArea> &
  TextAreaStyles;
export const TextArea = ({ className, ...props }: TextAreaProps) => (
  <AriaTextArea
    {...props}
    className={composeRenderProps(className, (className, renderProps) =>
      textAreaStyles({ className, ...renderProps }),
    )}
  />
);
