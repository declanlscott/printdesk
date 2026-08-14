import * as stylex from "@stylexjs/stylex";
import { Label } from "react-aria-components";

import { fieldLabelStyles } from "../../styles/field/label";

import type { LabelProps } from "react-aria-components";
import type { FieldLabelStyleProps } from "../../styles/field/label";

export type FieldLabelProps = FieldLabelStyleProps & LabelProps;

export function FieldLabel({ sx, ...props }: FieldLabelProps) {
  return <Label {...stylex.props(fieldLabelStyles.base, sx)} data-slot="field-label" {...props} />;
}
