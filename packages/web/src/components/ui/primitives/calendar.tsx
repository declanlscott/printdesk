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
import type { DateValue } from "react-aria-components";
import type { RangeValue } from "@react-types/shared";

export const BaseCalendar = AriaCalendar;

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

export type CalendarGridProps = ComponentProps<typeof AriaCalendarGrid>;
export const CalendarGrid = ({ className, ...props }: CalendarGridProps) => (
  <AriaCalendarGrid
    className={calendarStyles().grid({ className })}
    {...props}
  />
);

export type CalendarGridHeaderProps = ComponentProps<
  typeof AriaCalendarGridHeader
>;
export const CalendarGridHeader = ({ ...props }: CalendarGridHeaderProps) => (
  <AriaCalendarGridHeader {...props} />
);

export type CalendarHeaderCellProps = ComponentProps<
  typeof AriaCalendarHeaderCell
>;
export const CalendarHeaderCell = ({
  className,
  ...props
}: CalendarHeaderCellProps) => (
  <AriaCalendarHeaderCell
    className={calendarStyles().headerCell({ className })}
    {...props}
  />
);

export type CalendarGridBodyProps = ComponentProps<typeof AriaCalendarGridBody>;
export const CalendarGridBody = ({
  className,
  ...props
}: CalendarGridBodyProps) => (
  <AriaCalendarGridBody
    className={calendarStyles().grid({ className })}
    {...props}
  />
);

export type CalendarCellProps = ComponentProps<typeof AriaCalendarCell>;
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

export interface CalendarProps<TValue extends DateValue>
  extends ComponentProps<typeof BaseCalendar> {
  value: TValue | null | undefined;
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

export interface RangeCalendarProps<TValue extends DateValue>
  extends ComponentProps<typeof BaseRangeCalendar> {
  value: RangeValue<TValue> | null | undefined;
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
