import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps extends HTMLAttributes<HTMLDivElement> {
  /** Minimum table width for horizontal scroll. */
  minWidth?: string;
}

/** Framed data table matching admin list pages. */
export function DataTable({
  children,
  className,
  minWidth = "640px",
  ...props
}: DataTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)} {...props}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-border bg-muted/40 text-muted-foreground", className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function DataTableBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export function DataTableRow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-border/60 last:border-0", className)} {...props}>
      {children}
    </tr>
  );
}

export function DataTableHead({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3 font-medium", className)} {...props}>
      {children}
    </th>
  );
}

export function DataTableCell({
  children,
  className,
  muted = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { muted?: boolean }) {
  return (
    <td
      className={cn("px-4 py-3", muted && "text-muted-foreground", className)}
      {...props}
    >
      {children}
    </td>
  );
}
