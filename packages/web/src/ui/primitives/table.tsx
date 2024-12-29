import { tableStyles } from "~/styles/components/primitives/table";

import type { ComponentProps } from "react";

export type TableProps = ComponentProps<"table">;
export const Table = ({ className, ...props }: TableProps) => (
  <div className="relative w-full overflow-auto">
    <table className={tableStyles().root({ className })} {...props} />
  </div>
);

export type TableHeaderProps = ComponentProps<"thead">;
export const TableHeader = ({ className, ...props }: TableHeaderProps) => (
  <thead className={tableStyles().header({ className })} {...props} />
);

export type TableBodyProps = ComponentProps<"tbody">;
export const TableBody = ({ className, ...props }: TableBodyProps) => (
  <tbody className={tableStyles().body({ className })} {...props} />
);

export type TableFooterProps = ComponentProps<"tfoot">;
export const TableFooter = ({ className, ...props }: TableFooterProps) => (
  <tfoot className={tableStyles().footer({ className })} {...props} />
);

export type TableRowProps = ComponentProps<"tr">;
export const TableRow = ({ className, ...props }: TableRowProps) => (
  <tr className={tableStyles().row({ className })} {...props} />
);

export type TableHeadProps = ComponentProps<"th">;
export const TableHead = ({ className, ...props }: TableHeadProps) => (
  <th className={tableStyles().head({ className })} {...props} />
);

export type TableCellProps = ComponentProps<"td">;
export const TableCell = ({ className, ...props }: TableCellProps) => (
  <td className={tableStyles().cell({ className })} {...props} />
);

export type TableCaptionProps = ComponentProps<"caption">;
export const TableCaption = ({ className, ...props }: TableCaptionProps) => (
  <caption className={tableStyles().caption({ className })} {...props} />
);
