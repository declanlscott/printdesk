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
import type {
  ColorAreaProps as AriaColorAreaProps,
  ColorFieldProps as AriaColorFieldProps,
  ColorPickerProps as AriaColorPickerProps,
  ColorSliderProps as AriaColorSliderProps,
  ColorSwatchPickerItemProps as AriaColorSwatchPickerItemProps,
  ColorSwatchPickerProps as AriaColorSwatchPickerProps,
  ColorSwatchProps as AriaColorSwatchProps,
  ColorThumbProps as AriaColorThumbProps,
  ColorWheelProps as AriaColorWheelProps,
  ColorWheelTrackProps as AriaColorWheelTrackProps,
  SliderOutputProps as AriaSliderOutputProps,
  SliderTrackProps as AriaSliderTrackProps,
} from "react-aria-components";

export interface ColorSliderProps
  extends AriaColorSliderProps,
    ComponentProps<typeof AriaColorSlider> {}
export const ColorSlider = AriaColorSlider;

export interface ColorFieldProps
  extends AriaColorFieldProps,
    ComponentProps<typeof AriaColorField> {}
export const ColorField = AriaColorField;

export interface ColorWheelTrackProps
  extends AriaColorWheelTrackProps,
    ComponentProps<typeof AriaColorWheelTrack> {}
export const ColorWheelTrack = AriaColorWheelTrack;

export interface ColorPickerProps
  extends AriaColorPickerProps,
    ComponentProps<typeof AriaColorPicker> {}
export const ColorPicker = AriaColorPicker;

export interface SliderOutputProps
  extends AriaSliderOutputProps,
    ComponentProps<typeof AriaSliderOutput> {}
export const SliderOutput = AriaSliderOutput;

export interface ColorWheelProps
  extends AriaColorWheelProps,
    ComponentProps<typeof AriaColorWheel> {}
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

export interface ColorAreaProps
  extends AriaColorAreaProps,
    ComponentProps<typeof AriaColorArea> {}
export const ColorArea = ({ className, ...props }: ColorAreaProps) => (
  <AriaColorArea
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().area({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface SliderTrackProps
  extends AriaSliderTrackProps,
    ComponentProps<typeof AriaSliderTrack> {}
export const SliderTrack = ({ className, ...props }: SliderTrackProps) => (
  <AriaSliderTrack
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().sliderTrack({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface ColorThumbProps
  extends AriaColorThumbProps,
    ComponentProps<typeof AriaColorThumb> {}
export const ColorThumb = ({ className, ...props }: ColorThumbProps) => (
  <AriaColorThumb
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().thumb({ className, ...renderProps }),
    )}
    {...props}
  />
);

export interface ColorSwatchPickerProps
  extends AriaColorSwatchPickerProps,
    ComponentProps<typeof AriaColorSwatchPicker> {}
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

export interface ColorSwatchPickerItemProps
  extends AriaColorSwatchPickerItemProps,
    ComponentProps<typeof AriaColorSwatchPickerItem> {}
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

export interface ColorSwatchProps
  extends AriaColorSwatchProps,
    ComponentProps<typeof AriaColorSwatch> {}
export const ColorSwatch = ({ className, ...props }: ColorSwatchProps) => (
  <AriaColorSwatch
    className={composeRenderProps(className, (className, renderProps) =>
      colorStyles().swatch({ className, ...renderProps }),
    )}
    {...props}
  />
);
