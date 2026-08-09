import * as stylex from "@stylexjs/stylex";

import { cardTitleStyles } from "../../styles/card/title";

import type { CardTitleStyleProps } from "../../styles/card/title";

export type CardTitleProps = CardTitleStyleProps;

export function CardTitle({ sx, ...props }: CardTitleProps) {
  return <div {...stylex.props(cardTitleStyles.base, sx)} data-slot="card-title" {...props} />;
}
