import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive, composeRenderProps } from "react-aria-components";

import { checkboxStyles } from "../styles/checkbox";
import { checkboxMarker } from "../styles/markers.stylex";
import { spacing } from "../styles/tokens.stylex";

import type { CheckboxProps as CheckboxPrimitiveProps } from "react-aria-components";
import type { CheckboxStyleProps } from "../styles/checkbox";

export type CheckboxProps = CheckboxStyleProps & CheckboxPrimitiveProps;

export function Checkbox({ children, sx, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      {...stylex.props(checkboxStyles.base, checkboxMarker, sx)}
      data-slot="checkbox"
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span
            data-slot="checkbox-indicator"
            {...stylex.props(
              x.display.grid,
              x.placeContent.center,
              x.color("currentColor"),
              x.transitionProperty.none,
            )}
          >
            {(isSelected || isIndeterminate) && (
              <CheckIcon {...stylex.props(x.height(spacing[3.5]), x.width(spacing[3.5]))} />
            )}
          </span>
          {children}
        </>
      ))}
    </CheckboxPrimitive>
  );
}
