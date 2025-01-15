import { tv } from "tailwind-variants";

export const progressStyles = tv({
  slots: {
    root: "w-full",
    bar: "bg-secondary relative h-4 w-full overflow-hidden rounded-full",
    fill: "bg-primary size-full flex-1 transition-all",
  },
});
