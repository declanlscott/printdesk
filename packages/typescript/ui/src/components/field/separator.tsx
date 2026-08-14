import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";

import { fieldSeparatorStyles } from "../../styles/field/separator";
import { colors, spacing } from "../../styles/tokens.stylex";
import { Separator } from "../separator";

import type { FieldSeparatorStyleProps } from "../../styles/field/separator";

export type FieldSeparatorProps = FieldSeparatorStyleProps;

export function FieldSeparator({ children, sx, ...props }: FieldSeparatorProps) {
  return (
    <div
      {...stylex.props(fieldSeparatorStyles.base, sx)}
      data-slot="field-separator"
      data-content={!!children}
      {...props}
    >
      <Separator sx={[x.position.absolute, x.inset(spacing[0]), x.top("50%")]} />
      {children && (
        <span
          {...stylex.props(
            x.position.relative,
            x.marginTop.auto,
            x.display.block,
            x.width["fit-content"],
            x.backgroundColor(colors.background),
            x.paddingInline(spacing[2]),
            x.color(colors.mutedForeground),
          )}
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}
