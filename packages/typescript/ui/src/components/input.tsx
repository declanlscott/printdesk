import * as stylex from "@stylexjs/stylex";
import { Input as InputPrimitive } from "react-aria-components";

import { inputStyles } from "../styles/input";

import type { InputProps as InputPrimitiveProps } from "react-aria-components";
import type { InputStyleProps } from "../styles/input";

export type InputProps = InputPrimitiveProps & InputStyleProps;

export function Input({ sx, ...props }: InputProps) {
  return <InputPrimitive {...stylex.props(inputStyles.base, sx)} data-slot="input" {...props} />;
}
