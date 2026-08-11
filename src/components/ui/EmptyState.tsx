import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h3 className="mb-1 text-[15px] font-bold text-fg">{title}</h3>
      <p className="mb-6 max-w-xs text-[13px] text-muted">{description}</p>
      {action}
    </div>
  );
}
