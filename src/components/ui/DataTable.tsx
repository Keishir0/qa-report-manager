import React from "react";

interface DataTableProps {
  headers: string[];
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  headerCellClassName?: string;
  headerClassNames?: string[];
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
}: DataTableProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden ${className}`}
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
        <div className="overflow-x-auto overscroll-x-contain">
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
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
