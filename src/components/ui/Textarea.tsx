import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className = "", id, ...props }, ref) {
    return (
      <div className="min-w-0 w-full">
        {label && (
          <label htmlFor={id} className="label">
            {label}
          </label>
        )}
        <textarea
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
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
