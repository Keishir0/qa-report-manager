import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  search?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  search,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-line px-7 py-[18px] md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[19px] font-bold leading-tight text-fg">{title}</h1>
        {description && (
          <p className="mt-1 font-mono text-[11px] text-faint">{description}</p>
        )}
      </div>
      {(search || children) && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {search}
          {children}
        </div>
      )}
    </div>
  );
}
