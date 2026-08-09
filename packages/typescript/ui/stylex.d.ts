import type { StyleXStyles } from "@stylexjs/stylex";

declare module "react" {
  interface DOMAttributes<T> {
    sx?: StyleXStyles;
  }
}
