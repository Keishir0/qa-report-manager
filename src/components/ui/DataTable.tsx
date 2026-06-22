import React from "react";

interface DataTableProps {
  headers: React.ReactNode[];
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  headerCellClassName?: string;
  headerClassNames?: string[];
  responsiveCards?: boolean;
}

function getHeaderLabel(header: React.ReactNode) {
  if (typeof header === "string" || typeof header === "number") {
    return String(header);
  }

  if (React.isValidElement(header)) {
    const props = header.props as { "data-label"?: string; "aria-label"?: string };
    return props["data-label"] || props["aria-label"] || "";
  }

  return "";
}

function labelTableCells(children: React.ReactNode, headers: React.ReactNode[]): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (child.type === React.Fragment) {
      return React.cloneElement(child, {
        children: labelTableCells(child.props.children, headers),
      });
    }

    if (child.type !== "tr") return child;

    const cells = React.Children.map(child.props.children, (cell, index) => {
      if (!React.isValidElement(cell)) return cell;

      return React.cloneElement(cell as React.ReactElement<any>, {
        "data-label": getHeaderLabel(headers[index]),
      });
    });

    return React.cloneElement(child as React.ReactElement<any>, {
      children: cells,
    });
  });
}

export default function DataTable({
  headers,
  children,
  isLoading = false,
  isEmpty = false,
  emptyState,
  className = "",
  tableClassName = "w-full min-w-[860px] text-left border-collapse",
  headerCellClassName = "p-4",
  headerClassNames = [],
  responsiveCards = true,
}: DataTableProps) {
  const responsiveClassName = responsiveCards
    ? [
        "max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none",
        "[&_thead]:max-lg:hidden",
        "[&_table]:max-lg:block [&_table]:max-lg:min-w-0",
        "[&_tbody]:max-lg:block [&_tbody]:max-lg:space-y-3 [&_tbody]:max-lg:divide-y-0",
        "[&_tr]:max-lg:block [&_tr]:max-lg:rounded-xl [&_tr]:max-lg:border [&_tr]:max-lg:border-slate-200 [&_tr]:max-lg:bg-white [&_tr]:max-lg:shadow-xs",
        "[&_td]:max-lg:flex [&_td]:max-lg:min-h-0 [&_td]:max-lg:w-full [&_td]:max-lg:items-center [&_td]:max-lg:justify-between [&_td]:max-lg:gap-4 [&_td]:max-lg:border-b [&_td]:max-lg:border-slate-100 [&_td]:max-lg:px-4 [&_td]:max-lg:py-3 [&_td]:max-lg:text-right",
        "[&_td:last-child]:max-lg:border-b-0",
        "[&_td]:max-lg:before:shrink-0 [&_td]:max-lg:before:text-left [&_td]:max-lg:before:text-[10px] [&_td]:max-lg:before:font-bold [&_td]:max-lg:before:uppercase [&_td]:max-lg:before:tracking-wider [&_td]:max-lg:before:text-slate-400 [&_td]:max-lg:before:content-[attr(data-label)]",
      ].join(" ")
    : "";
  const labeledChildren = responsiveCards
    ? labelTableCells(children, headers)
    : children;

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${responsiveClassName} ${className}`}
    >
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <svg
            className="animate-spin h-6 w-6 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xs font-semibold text-slate-500">
            Buscando dados...
          </span>
        </div>
      ) : isEmpty ? (
        emptyState || (
          <div className="p-12 text-center text-slate-400 text-sm font-medium">
            Nenhum dado encontrado.
          </div>
        )
      ) : (
        <div className="overflow-x-auto overscroll-x-contain max-lg:overflow-visible">
          <table className={tableClassName}>
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] border-b border-slate-200 uppercase tracking-wider">
                {headers.map((h, i) => (
                  <th key={i} className={`${headerCellClassName} ${headerClassNames[i] || ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{labeledChildren}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
