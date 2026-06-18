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

  // Filter preset options based on search query, excluding already selected ones
  const filteredPresets = options.filter(
    (opt) =>
      opt.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedValues.includes(opt)
  );

  const showCreateOption =
    inputValue.trim() &&
    !options.map((o) => o.toLowerCase()).includes(inputValue.toLowerCase().trim()) &&
    !selectedValues.map((s) => s.toLowerCase()).includes(inputValue.toLowerCase().trim());

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      {label && (
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      {/* Control / Selected tags list + input */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`min-h-10 w-full flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border bg-white cursor-text transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 ${
          error ? "border-red-300" : "border-slate-300"
        }`}
      >
        {selectedValues.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-md border border-indigo-100 max-w-full truncate"
          >
            <span className="truncate">{val}</span>
            <button
              type="button"
              onClick={(e) => handleRemove(val, e)}
              className="text-indigo-400 hover:text-indigo-600 focus:outline-none shrink-0"
            >
              &times;
            </button>
          </span>
        ))}

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
          className="flex-1 min-w-[120px] bg-transparent text-xs p-1 focus:outline-hidden"
        />

        {/* Chevron arrow indicator */}
        <div className="ml-auto pr-1 text-slate-400 pointer-events-none shrink-0">
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

      {error && (
        <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
          {/* Preset Options */}
          {filteredPresets.length > 0 ? (
            <div className="p-1">
              {filteredPresets.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full text-left text-xs font-medium text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-900 px-3 py-2 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>{opt}</span>
                  {selectedValues.includes(opt) && (
                    <svg
                      className="w-3.5 h-3.5 text-indigo-600"
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
                className="w-full text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50/60 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Criar branch:</span>
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[11px] truncate max-w-[150px]">
                  {inputValue.trim()}
                </span>
                <span className="text-[10px] font-medium text-slate-400 ml-auto">
                  (Pressione Enter)
                </span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {filteredPresets.length === 0 && !showCreateOption && (
            <div className="p-3 text-center text-xs text-slate-400 font-medium">
              {inputValue ? "Nenhuma branch encontrada" : "Todas as branches selecionadas"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
