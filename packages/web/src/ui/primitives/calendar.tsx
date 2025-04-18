import { useContext } from "react";
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  Heading as AriaHeading,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarStateContext as AriaRangeCalendarStateContext,
  Text as AriaText,
  composeRenderProps,
  useLocale,
} from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  calendarCellStyles,
  calendarHeadingButtonStyles,
  calendarStyles,
} from "~/styles/components/primitives/calendar";

import type { ComponentProps } from "react";
import type {
  CalendarCellProps as AriaCalendarCellProps,
  CalendarGridBodyProps as AriaCalendarGridBodyProps,
  CalendarGridHeaderProps as AriaCalendarGridHeaderProps,
  CalendarGridProps as AriaCalendarGridProps,
  CalendarHeaderCellProps as AriaCalendarHeaderCellProps,
  CalendarProps as AriaCalendarProps,
  RangeCalendarProps as AriaRangeCalendarProps,
  DateValue,
} from "react-aria-components";

export interface BaseCalendarProps<TDateValue extends DateValue>
  extends AriaCalendarProps<TDateValue>,
    ComponentProps<typeof AriaCalendar<TDateValue>> {}
export const BaseCalendar = AriaCalendar;

export interface BaseRangeCalendarProps<TDateValue extends DateValue>
  extends AriaRangeCalendarProps<TDateValue>,
    ComponentProps<typeof AriaRangeCalendar<TDateValue>> {}
export const BaseRangeCalendar = AriaRangeCalendar;

export type CalendarHeadingProps = ComponentProps<"header">;
export const CalendarHeading = (props: CalendarHeadingProps) => {
  const { direction } = useLocale();

  return (
    <header className="flex w-full items-center gap-1 px-1 pb-4" {...props}>
      <AriaButton
        slot="previous"
        className={composeRenderProps("", (_className, renderProps) =>
          calendarHeadingButtonStyles({ variant: "outline", ...renderProps }),
        )}
      >
        {direction === "rtl" ? (
          <ChevronRight aria-hidden className="size-4" />
        ) : (
          <ChevronLeft aria-hidden className="size-4" />
        )}
      </AriaButton>

      <AriaHeading className="grow text-center text-sm font-medium" />

      <AriaButton
        slot="next"
        className={composeRenderProps("", (_className, renderProps) =>
          calendarHeadingButtonStyles({ variant: "outline", ...renderProps }),
        )}
      >
        {direction === "rtl" ? (
          <ChevronLeft aria-hidden className="size-4" />
        ) : (
          <ChevronRight aria-hidden className="size-4" />
        )}
      </AriaButton>
    </header>
  );
};

export interface CalendarGridProps
  extends AriaCalendarGridProps,
    ComponentProps<typeof AriaCalendarGrid> {}
export const CalendarGrid = ({ className, ...props }: CalendarGridProps) => (
  <AriaCalendarGrid
    className={calendarStyles().grid({ className })}
    {...props}
  />
);

export interface CalendarGridHeaderProps
  extends AriaCalendarGridHeaderProps,
    ComponentProps<typeof AriaCalendarGridHeader> {}
export const CalendarGridHeader = ({ ...props }: CalendarGridHeaderProps) => (
  <AriaCalendarGridHeader {...props} />
);

export interface CalendarHeaderCellProps
  extends AriaCalendarHeaderCellProps,
    ComponentProps<typeof AriaCalendarHeaderCell> {}
export const CalendarHeaderCell = ({
  className,
  ...props
}: CalendarHeaderCellProps) => (
  <AriaCalendarHeaderCell
    className={calendarStyles().headerCell({ className })}
    {...props}
  />
);

export interface CalendarGridBodyProps
  extends AriaCalendarGridBodyProps,
    ComponentProps<typeof AriaCalendarGridBody> {}
export const CalendarGridBody = ({
  className,
  ...props
}: CalendarGridBodyProps) => (
  <AriaCalendarGridBody
    className={calendarStyles().grid({ className })}
    {...props}
  />
);

export interface CalendarCellProps
  extends AriaCalendarCellProps,
    ComponentProps<typeof AriaCalendarCell> {}
export function CalendarCell({ className, ...props }: CalendarCellProps) {
  const isRange = Boolean(useContext(AriaRangeCalendarStateContext));

  return (
    <AriaCalendarCell
      className={composeRenderProps(className, (className, renderProps) =>
        calendarCellStyles({
          className,
          ...renderProps,
          isHovered:
            renderProps.isHovered &&
            renderProps.isSelected &&
            (renderProps.isSelectionStart ||
              renderProps.isSelectionEnd ||
              !isRange),
          isCurrentDate:
            renderProps.date.compare(today(getLocalTimeZone())) === 0,
          isRange,
        }),
      )}
      {...props}
    />
  );
}

export interface CalendarProps<TDateValue extends DateValue>
  extends BaseCalendarProps<TDateValue> {
  errorMessage?: string;
}
export const Calendar = <TValue extends DateValue>({
  errorMessage,
  className,
  ...props
}: CalendarProps<TValue>) => (
  <BaseCalendar
    className={composeRenderProps(className, (className) =>
      calendarStyles().root({ className }),
    )}
    {...props}
  >
    <CalendarHeading />

    <CalendarGrid>
      <CalendarGridHeader>
        {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
      </CalendarGridHeader>

      <CalendarGridBody>
        {(date) => <CalendarCell date={date} />}
      </CalendarGridBody>
    </CalendarGrid>

    {errorMessage && (
      <AriaText className="text-destructive text-sm" slot="errorMessage">
        {errorMessage}
      </AriaText>
    )}
  </BaseCalendar>
);

export interface RangeCalendarProps<TDateValue extends DateValue>
  extends BaseRangeCalendarProps<TDateValue> {
  errorMessage?: string;
}
export const RangeCalendar = <TValue extends DateValue>({
  errorMessage,
  className,
  ...props
}: RangeCalendarProps<TValue>) => (
  <BaseRangeCalendar
    className={composeRenderProps(className, (className) =>
      calendarStyles().root({ className }),
    )}
    {...props}
  >
    <CalendarHeading />

    <CalendarGrid>
      <CalendarGridHeader>
        {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
      </CalendarGridHeader>

      <CalendarGridBody>
        {(date) => <CalendarCell date={date} />}
      </CalendarGridBody>
    </CalendarGrid>

    {errorMessage && (
      <AriaText slot="errorMessage" className="text-destructive text-sm">
        {errorMessage}
      </AriaText>
    )}
  </BaseRangeCalendar>
);
