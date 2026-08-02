import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentProps, JSX } from "react";

export type StyleXComponentProps<TElement extends keyof JSX.IntrinsicElements> =
  ComponentProps<TElement> & {
    /** @deprecated Prefer passing in StyleX styles with the `sx` prop */
    className?: ComponentProps<TElement>["className"];
    /** @deprecated Prefer passing in StyleX styles with the `sx` prop */
    style?: ComponentProps<TElement>["style"];

    sx?: StyleXStyles;
  };
