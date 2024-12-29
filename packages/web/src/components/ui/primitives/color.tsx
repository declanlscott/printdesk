import {
  ColorArea as AriaColorArea,
  ColorField as AriaColorField,
  ColorPicker as AriaColorPicker,
  ColorSlider as AriaColorSlider,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem as AriaColorSwatchPickerItem,
  ColorThumb as AriaColorThumb,
  ColorWheel as AriaColorWheel,
  ColorWheelTrack as AriaColorWheelTrack,
  SliderOutput as AriaSliderOutput,
  SliderTrack as AriaSliderTrack,
  composeRenderProps,
} from "react-aria-components";

import {
  colorStyles,
  colorSwatchPickerItemStyles,
} from "~/styles/components/primitives/color";

import type { ComponentProps } from "react";

export const ColorSlider = AriaColorSlider;

export const ColorField = AriaColorField;

export const ColorWheelTrack = AriaColorWheelTrack;

export const ColorPicker = AriaColorPicker;

export const SliderOutput = AriaSliderOutput;

export interface ColorWheelProps
  extends Omit<
    ComponentProps<typeof AriaColorWheel>,
    "outerRadius" | "innerRadius"
  > {
  outerRadius?: number;
  innerRadius?: number;
}
export const ColorWheel = ({
  className,
  outerRadius = 100,
  innerRadius = 74,
  ...props
}: ColorWheelProps) => (
  <AriaColorWheel
    innerRadius={innerRadius}
    outerRadius={outerRadius}
    className={className}
    {...props}
  />
);

export type ColorAreaProps = ComponentProps<typeof AriaColorArea>;
export const ColorArea = ({ className, ...props }: ColorAreaProps) => (
  <AriaColorArea
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().area({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type SliderTrackProps = ComponentProps<typeof AriaSliderTrack>;
export const SliderTrack = ({ className, ...props }: SliderTrackProps) => (
  <AriaSliderTrack
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().sliderTrack({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ColorThumbProps = ComponentProps<typeof AriaColorThumb>;
export const ColorThumb = ({ className, ...props }: ColorThumbProps) => (
  <AriaColorThumb
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().thumb({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ColorSwatchPickerProps = ComponentProps<
  typeof AriaColorSwatchPicker
>;
export const ColorSwatchPicker = ({
  className,
  ...props
}: ColorSwatchPickerProps) => (
  <AriaColorSwatchPicker
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().swatchPicker({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ColorSwatchPickerItemProps = ComponentProps<
  typeof AriaColorSwatchPickerItem
>;
export const ColorSwatchPickerItem = ({
  className,
  ...props
}: ColorSwatchPickerItemProps) => (
  <AriaColorSwatchPickerItem
    className={composeRenderProps(className, (className, renderProps) =>
      colorSwatchPickerItemStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export type ColorSwatchProps = ComponentProps<typeof AriaColorSwatch>;
export const ColorSwatch = ({ className, ...props }: ColorSwatchProps) => (
  <AriaColorSwatch
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().swatch({ className, ...renderProps }),
    )}
    {...props}
  />
);
