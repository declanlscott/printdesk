import * as stylex from "@stylexjs/stylex";

import { cardSizes, cardStyles } from "../../styles/card";

import type { CardStyleProps } from "../../styles/card";

export type CardProps = CardStyleProps;

export function Card({ size = "default", sx, ...props }: CardProps) {
  return (
    <div
      {...stylex.props(cardStyles.base, cardSizes[size], sx)}
      data-slot="card"
      data-size={size}
      {...props}
    />
  );
}
