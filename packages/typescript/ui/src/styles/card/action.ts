import * as stylex from "@stylexjs/stylex";

import type { StyleXComponentProps } from "../types";

export const cardActionStyles = stylex.create({
  base: {
    gridColumnStart: 2,
    gridRow: "span 2 / span 2",
    gridRowStart: 1,
    alignSelf: "start",
    justifySelf: "end",
  },
});

export type CardActionStyleProps = StyleXComponentProps<"div">;
