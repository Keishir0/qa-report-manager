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
  /** Slot de rodapé opcional, usado para paginação. */
  footer?: React.ReactNode;
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

/**
 * Percorre as linhas fornecidas pelo caller para injetar o data-label (usado
 * pelo layout responsivo em cards) e, quando a linha tem `data-row-accent`
 * (uma cor CSS, ex. "rgb(var(--bad))"), aplica a borda esquerda de 3px na
 * primeira célula — essa é a implementação de `rowAccent` sem exigir que o
 * DataTable conheça a estrutura dos dados de cada tela.
 */
function processRows(children: React.ReactNode, headers: React.ReactNode[]): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (child.type === React.Fragment) {
      return React.cloneElement(child, {
        children: processRows(child.props.children, headers),
      });
    }

    if (child.type !== "tr") return child;

    const trProps = child.props as { "data-row-accent"?: string; children?: React.ReactNode };
    const rowAccent = trProps["data-row-accent"];

    const cells = React.Children.map(trProps.children, (cell, index) => {
      if (!React.isValidElement(cell)) return cell;

      const cellProps = cell.props as { style?: React.CSSProperties };
      const extraProps: Record<string, unknown> = {
        "data-label": getHeaderLabel(headers[index]),
      };

      if (index === 0 && rowAccent) {
        extraProps.style = {
          ...cellProps.style,
          borderLeft: `3px solid ${rowAccent}`,
        };
      }

      return React.cloneElement(cell as React.ReactElement<any>, extraProps);
    });

    return React.cloneElement(child as React.ReactElement<any>, { children: cells });
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
  headerCellClassName = "px-2 py-3.5",
  headerClassNames = [],
  responsiveCards = true,
  footer,
}: DataTableProps) {
  const responsiveClassName = responsiveCards
    ? [
        "max-lg:border-0 max-lg:bg-transparent",
        "[&_thead]:max-lg:hidden",
        "[&_table]:max-lg:block [&_table]:max-lg:min-w-0",
        "[&_tbody]:max-lg:block [&_tbody]:max-lg:space-y-3 [&_tbody]:max-lg:divide-y-0",
        "[&_tr]:max-lg:block [&_tr]:max-lg:rounded-[14px] [&_tr]:max-lg:border [&_tr]:max-lg:border-line [&_tr]:max-lg:bg-panel",
        "[&_td]:max-lg:flex [&_td]:max-lg:min-h-0 [&_td]:max-lg:w-full [&_td]:max-lg:items-center [&_td]:max-lg:justify-between [&_td]:max-lg:gap-4 [&_td]:max-lg:border-b [&_td]:max-lg:border-hairline [&_td]:max-lg:px-4 [&_td]:max-lg:py-3 [&_td]:max-lg:text-right",
        "[&_td:last-child]:max-lg:border-b-0",
        "[&_td]:max-lg:before:shrink-0 [&_td]:max-lg:before:text-left [&_td]:max-lg:before:font-mono [&_td]:max-lg:before:text-[10px] [&_td]:max-lg:before:font-medium [&_td]:max-lg:before:uppercase [&_td]:max-lg:before:tracking-[0.12em] [&_td]:max-lg:before:text-faint [&_td]:max-lg:before:content-[attr(data-label)]",
      ].join(" ")
    : "";
  const processedChildren = processRows(children, headers);

  return (
    <div
      className={`bg-panel border border-line rounded-[14px] overflow-hidden ${responsiveClassName} ${className}`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted">
          <svg className="h-6 w-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
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
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            Buscando dados...
          </span>
        </div>
      ) : isEmpty ? (
        emptyState || (
          <div className="p-12 text-center text-[13px] text-muted">Nenhum dado encontrado.</div>
        )
      ) : (
        <div className="overflow-x-auto overscroll-x-contain max-lg:overflow-visible">
          <table className={tableClassName}>
            <thead>
              <tr className="text-faint">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint ${headerCellClassName} ${
                      headerClassNames[i] || ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-hairline">{processedChildren}</tbody>
          </table>
        </div>
      )}
      {footer && !isLoading && !isEmpty && footer}
    </div>
  );
}
