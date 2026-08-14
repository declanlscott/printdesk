import * as stylex from "@stylexjs/stylex";
import { Separator as SeparatorPrimitive } from "react-aria-components";

import { separatorOrientations, separatorStyles } from "../styles/separator";

import type { SeparatorProps as SeparatorPrimitiveProps } from "react-aria-components";
import type { SeparatorStyleProps } from "../styles/separator";

export type SeparatorProps = SeparatorStyleProps & SeparatorPrimitiveProps;

export function Separator({ orientation = "horizontal", sx, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      {...stylex.props(separatorStyles.base, separatorOrientations[orientation], sx)}
      data-slot="separator"
      orientation={orientation}
      {...props}
    />
  );
}
