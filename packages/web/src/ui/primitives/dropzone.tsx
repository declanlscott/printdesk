import {
  DropZone as AriaDropzone,
  composeRenderProps,
} from "react-aria-components";

import { dropzoneStyles } from "~/styles/components/primitives/dropzone";

import type { ComponentProps } from "react";
import type { DropZoneProps as AriaDropZoneProps } from "react-aria-components";

export interface DropzoneProps
  extends AriaDropZoneProps,
    ComponentProps<typeof AriaDropzone> {}

export const Dropzone = ({ className, ...props }: DropzoneProps) => (
  <AriaDropzone
    className={composeRenderProps(className, (className, renderProps) =>
      dropzoneStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
