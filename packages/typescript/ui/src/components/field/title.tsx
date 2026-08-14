import * as stylex from "@stylexjs/stylex";

import { fieldTitleStyles } from "../../styles/field/title";

import type { FieldTitleStyleProps } from "../../styles/field/title";

export type FieldTitleProps = FieldTitleStyleProps;

export function FieldTitle({ sx, ...props }: FieldTitleProps) {
  return <div {...stylex.props(fieldTitleStyles.base, sx)} data-slot="field-label" {...props} />;
}
