import * as stylex from "@stylexjs/stylex";

import { fieldContentStyles } from "../../styles/field/content";

import type { FieldContentStyleProps } from "../../styles/field/content";

export type FieldContentProps = FieldContentStyleProps;

export function FieldContent({ sx, ...props }: FieldContentProps) {
  return (
    <div {...stylex.props(fieldContentStyles.base, sx)} data-slot="field-content" {...props} />
  );
}
