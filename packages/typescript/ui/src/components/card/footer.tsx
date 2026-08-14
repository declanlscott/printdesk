import * as stylex from "@stylexjs/stylex";

import { cardFooterStyles } from "../../styles/card/footer";
import { cardFooterMarker } from "../../styles/markers.stylex";

import type { CardFooterStyleProps } from "../../styles/card/footer";

export type CardHeaderProps = CardFooterStyleProps;

export function CardFooter({ sx, ...props }: CardHeaderProps) {
  return (
    <div
      {...stylex.props(cardFooterStyles.base, sx, cardFooterMarker)}
      data-slot="card-footer"
      {...props}
    />
  );
}
