import * as stylex from "@stylexjs/stylex";

import { fieldOrientations, fieldStyles, type FieldStyleProps } from "../../styles/field";
import { fieldMarker } from "../../styles/markers.stylex";

export type FieldProps = FieldStyleProps;

export function Field({ orientation = "vertical", sx, ...props }: FieldProps) {
  return (
    <div
      {...stylex.props(fieldStyles.base, fieldOrientations[orientation], fieldMarker, sx)}
      role="group"
      data-slot="field"
      data-orientation={orientation}
      {...props}
    />
  );
}
