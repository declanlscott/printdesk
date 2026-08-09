import * as stylex from "@stylexjs/stylex";

import { cardDescriptionStyles } from "../../styles/card/description";
import { cardDescriptionMarker } from "../../styles/card/markers.stylex";

import type { CardDescriptionStyleProps } from "../../styles/card/description";

export type CardDescriptionProps = CardDescriptionStyleProps;

export function CardDescription({ sx, ...props }: CardDescriptionProps) {
  return (
    <div
      {...stylex.props(cardDescriptionStyles.base, sx, cardDescriptionMarker)}
      data-slot="card-description"
      {...props}
    />
  );
}
