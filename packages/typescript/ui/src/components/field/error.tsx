import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import * as Array from "effect/Array";
import { useMemo } from "react";

import { fieldErrorStyles } from "../../styles/field/error";
import { spacing } from "../../styles/tokens.stylex";

import type { FieldErrorStyleProps } from "../../styles/field/error";

export interface FieldErrorProps extends FieldErrorStyleProps {
  errors?: Array<{ message?: string } | undefined>;
}

export function FieldError({ errors, children, sx, ...props }: FieldErrorProps) {
  // oxlint-disable-next-line typescript/promise-function-async
  const content = useMemo(() => {
    if (children) return children;

    if (!errors?.length) return null;

    const uniqueErrors = Array.dedupeWith(errors, (a, b) => !!a && !!b && a.message === b.message);
    if (uniqueErrors.length === 1) return uniqueErrors[0]?.message;

    return (
      <ul
        {...stylex.props(
          x.marginLeft(spacing[4]),
          x.display.flex,
          x.listStyleType.disc,
          x.flexDirection.column,
          x.gap(spacing[1]),
        )}
      >
        {Array.map(
          uniqueErrors,
          (error, index) => error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [errors, children]);

  if (!content) return null;

  return (
    <div
      {...stylex.props(fieldErrorStyles.base, sx)}
      role="alert"
      data-slot="field-error"
      {...props}
    >
      {content}
    </div>
  );
}
