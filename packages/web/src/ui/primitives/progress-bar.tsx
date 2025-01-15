import {
  ProgressBar as AriaProgressBar,
  composeRenderProps,
} from "react-aria-components";

import { progressStyles } from "~/styles/components/primitives/progress-bar";

import type { ProgressBarProps as AriaProgressBarProps } from "react-aria-components";

interface ProgressProps extends AriaProgressBarProps {
  barClassName?: string;
  fillClassName?: string;
}

export const ProgressBar = ({
  className,
  barClassName,
  fillClassName,
  children,
  ...props
}: ProgressProps) => (
  <AriaProgressBar
    {...props}
    className={composeRenderProps(className, (className) =>
      progressStyles().root({ className }),
    )}
  >
    {composeRenderProps(children, (children, renderProps) => (
      <>
        {children}

        <div className={progressStyles().bar({ className: barClassName })}>
          <div
            className={progressStyles().fill({ className: fillClassName })}
            style={{
              transform: `translateX(-${100 - (renderProps.percentage ?? 0)}%)`,
            }}
          />
        </div>
      </>
    ))}
  </AriaProgressBar>
);
