import * as stylex from "@stylexjs/stylex";

import { cardContentStyles } from "../../styles/card/content";

import type { CardContentStyleProps } from "../../styles/card/content";

export type CardContentProps = CardContentStyleProps;

export function CardContent({ sx, ...props }: CardContentProps) {
  return <div {...stylex.props(cardContentStyles.base, sx)} data-slot="card-content" {...props} />;
}
