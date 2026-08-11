import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: (string | SelectOption)[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, children, className = "", id, ...props },
  ref
) {
  return (
    <div className="min-w-0 w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`input ${
          error ? "border-bad focus:border-bad focus:ring-bad/16" : ""
        } ${className}`}
        {...props}
      >
        {children ? (
          children
        ) : (
          <>
            <option value="">Selecione...</option>
            {options?.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </>
        )}
      </select>
      {error && <p className="mt-1.5 text-[11.5px] font-semibold text-bad">{error}</p>}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
