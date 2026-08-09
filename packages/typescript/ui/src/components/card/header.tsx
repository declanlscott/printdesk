import * as stylex from "@stylexjs/stylex";

import { cardHeaderStyles } from "../../styles/card/header";

import type { CardHeaderStyleProps } from "../../styles/card/header";

export type CardHeaderProps = CardHeaderStyleProps;

export function CardHeader({ sx, ...props }: CardHeaderProps) {
  return <div {...stylex.props(cardHeaderStyles.base, sx)} data-slot="card-header" {...props} />;
}
