import * as stylex from "@stylexjs/stylex";

import type { StyleXComponentProps } from "../types";

export const cardActionStyles = stylex.create({
  base: {
    gridRow: "span 2 / span 2",
    alignSelf: "start",
    gridColumnStart: "2",
    gridRowStart: "1",
    justifySelf: "end",
  },
});

export type CardActionStyleProps = StyleXComponentProps<"div">;
