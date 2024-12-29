import {
  DropZone as AriaDropzone,
  composeRenderProps,
} from "react-aria-components";

import { dropzoneStyles } from "~/styles/components/primitives/dropzone";

import type { ComponentProps } from "react";

export type DropzoneProps = ComponentProps<typeof AriaDropzone>;

export const Dropzone = ({ className, ...props }: DropzoneProps) => (
  <AriaDropzone
    className={composeRenderProps(className, (className, renderProps) =>
      dropzoneStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
