import * as stylex from "@stylexjs/stylex";

import { fieldSetStyles } from "../../styles/field/set";

import type { FieldSetStyleProps } from "../../styles/field/set";

export type FieldSetProps = FieldSetStyleProps;

export function FieldSet({ sx, ...props }: FieldSetProps) {
  return <fieldset {...stylex.props(fieldSetStyles.base, sx)} data-slot="field-set" {...props} />;
}
