import * as stylex from "@stylexjs/stylex";
import { composeRenderProps, Switch as SwitchPrimitive } from "react-aria-components";

import { switchMarker } from "../styles/markers.stylex";
import { switchSizes, switchStyles } from "../styles/switch";

import type { SwitchProps as SwitchPrimitiveProps } from "react-aria-components";
import type { SwitchStyleProps } from "../styles/switch";

export type SwitchProps = SwitchStyleProps & SwitchPrimitiveProps;

export function Switch({ children, size = "default", sx, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive
      {...stylex.props(switchStyles.base, switchSizes[size], switchMarker, sx)}
      data-size={size}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            {...stylex.props(switchStyles.thumb)}
            data-slot="switch-thumb"
            data-selected={isSelected || undefined}
          />
          {children}
        </>
      ))}
    </SwitchPrimitive>
  );
}
