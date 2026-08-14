import * as stylex from "@stylexjs/stylex";

import { fieldGroupStyles } from "../../styles/field/group";
import { fieldGroupMarker } from "../../styles/markers.stylex";

import type { FieldGroupStyleProps } from "../../styles/field/group";

export type FieldGroupProps = FieldGroupStyleProps;

export function FieldGroup({ sx, ...props }: FieldGroupStyleProps) {
  return (
    <div
      {...stylex.props(fieldGroupStyles.base, fieldGroupMarker, sx)}
      data-slot="field-group"
      {...props}
    />
  );
}
