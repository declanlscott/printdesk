import * as stylex from "@stylexjs/stylex";

import { cardActionStyles } from "../../styles/card/action";
import { cardActionMarker } from "../../styles/markers.stylex";

import type { CardActionStyleProps } from "../../styles/card/action";

export type CardActionProps = CardActionStyleProps;

export function CardAction({ sx, ...props }: CardActionProps) {
  return (
    <div
      {...stylex.props(cardActionStyles.base, sx, cardActionMarker)}
      data-slot="card-action"
      {...props}
    />
  );
}
