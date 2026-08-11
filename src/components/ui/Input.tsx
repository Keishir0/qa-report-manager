import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref
) {
  return (
    <div className="min-w-0 w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        className={`input ${
          error ? "border-bad focus:border-bad focus:ring-bad/16" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-[11.5px] font-semibold text-bad">{error}</p>}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
