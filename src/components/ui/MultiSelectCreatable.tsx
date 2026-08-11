import React, { useState, useRef, useEffect } from "react";

interface MultiSelectCreatableProps {
  label?: string;
  id?: string;
  placeholder?: string;
  options: string[];
  value: string; // Comma-separated string, e.g., "master, alfa"
  onChange: (value: string) => void;
  error?: string;
}

export default function MultiSelectCreatable({
  label,
  id,
  placeholder = "Selecione ou digite...",
  options,
  value,
  onChange,
  error,
}: MultiSelectCreatableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current value (comma separated string)
  const selectedValues = value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  const maxTagsToShow = 1;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    if (selectedValues.includes(val)) {
      // Remove
      const next = selectedValues.filter((v) => v !== val);
      onChange(next.join(", "));
    } else {
      // Add
      const next = [...selectedValues, val];
      onChange(next.join(", "));
    }
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleRemove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = selectedValues.filter((v) => v !== val);
    onChange(next.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        if (!selectedValues.includes(trimmed)) {
          const next = [...selectedValues, trimmed];
          onChange(next.join(", "));
        }
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && selectedValues.length > 0) {
      // Remove last tag
      const next = selectedValues.slice(0, -1);
      onChange(next.join(", "));
    }
  };

  // Filter preset options based on search query
  const filteredPresets = options.filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption =
    inputValue.trim() &&
    !options.map((o) => o.toLowerCase()).includes(inputValue.toLowerCase().trim()) &&
    !selectedValues.map((s) => s.toLowerCase()).includes(inputValue.toLowerCase().trim());

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      {label && <label className="label">{label}</label>}

      {/* Control / Selected tags list + input */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`input h-10 min-h-10 flex cursor-text items-center justify-between gap-1.5 py-1.5 ${
          error ? "border-bad focus-within:border-bad focus-within:ring-bad/16" : "focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/16"
        }`}
        title={value}
      >
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {selectedValues.slice(0, maxTagsToShow).map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-accent/25 max-w-[120px] truncate shrink-0"
            >
              <span className="truncate">{val}</span>
              <button
                type="button"
                onClick={(e) => handleRemove(val, e)}
                className="shrink-0 text-sm font-normal text-accent/70 hover:text-accent focus:outline-hidden"
              >
                &times;
              </button>
            </span>
          ))}

          {selectedValues.length > maxTagsToShow && (
            <span className="inline-flex items-center bg-panel2 text-fg2 text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-line shrink-0">
              +{selectedValues.length - maxTagsToShow} mais
            </span>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={selectedValues.length === 0 ? placeholder : ""}
            className="flex-grow min-w-[60px] bg-transparent text-[13px] p-0 border-none text-fg outline-none placeholder:text-faint focus:outline-hidden focus:ring-0"
            style={{ border: "none", boxShadow: "none" }}
          />
        </div>

        {/* Chevron arrow indicator */}
        <div className="pointer-events-none shrink-0 pl-1 text-faint">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {error && <p className="mt-1.5 text-[11.5px] font-semibold text-bad">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 max-h-60 overflow-y-auto divide-y divide-hairline rounded-[9px] border border-line bg-panel">
          {/* Preset Options */}
          {filteredPresets.length > 0 ? (
            <div className="p-1">
              {filteredPresets.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left text-[13px] font-medium px-3 py-2 rounded-[7px] transition-colors flex items-center justify-between ${
                    selectedValues.includes(opt)
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-fg2 hover:bg-panel2"
                  }`}
                >
                  <span>{opt}</span>
                  {selectedValues.includes(opt) && (
                    <svg
                      className="w-3.5 h-3.5 shrink-0 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : null}

          {/* Creatable Tag Option */}
          {showCreateOption && (
            <div className="p-1">
              <button
                key="create-option-button"
                type="button"
                onClick={() => {
                  handleSelect(inputValue.trim());
                }}
                className="flex w-full items-center gap-1.5 rounded-[7px] px-3 py-2 text-left text-[13px] font-bold text-accent transition-colors hover:bg-accent/10"
              >
                <span>Criar branch:</span>
                <span className="max-w-[150px] truncate rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                  {inputValue.trim()}
                </span>
                <span className="ml-auto text-[10px] font-medium text-faint">
                  (Pressione Enter)
                </span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {filteredPresets.length === 0 && !showCreateOption && (
            <div className="p-3 text-center text-[13px] font-medium text-faint">
              Nenhuma branch encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
