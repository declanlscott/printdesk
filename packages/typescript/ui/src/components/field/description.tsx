import * as stylex from "@stylexjs/stylex";

import { fieldDescriptionStyles } from "../../styles/field/description";

import type { FieldDescriptionStyleProps } from "../../styles/field/description";

export type FieldDescriptionProps = FieldDescriptionStyleProps;

export function FieldDescription({ sx, ...props }: FieldDescriptionProps) {
  return (
    <p
      {...stylex.props(fieldDescriptionStyles.base, sx)}
      data-slot="field-description"
      {...props}
    />
  );
}
