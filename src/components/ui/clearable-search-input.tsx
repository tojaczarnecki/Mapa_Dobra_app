"use client";

import { X } from "lucide-react";
import { useRef, useState, type InputHTMLAttributes } from "react";

type ClearableSearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  onClear?: () => void;
};

export function ClearableSearchInput({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onClear,
  style,
  className = "",
  ...props
}: ClearableSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  function handleClear() {
    if (!isControlled) setUncontrolledValue("");
    onClear?.();
    inputRef.current?.focus();
  }

  return (
    <span className="relative block min-w-0 flex-1">
      <input
        {...props}
        ref={inputRef}
        type="search"
        value={currentValue}
        onChange={(event) => {
          if (!isControlled) setUncontrolledValue(event.target.value);
          onChange?.(event);
        }}
        className={["w-full min-w-0 pr-12 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none", className].join(" ")}
        style={{ ...style, paddingRight: "3rem" }}
      />
      {currentValue ? (
        <button
          type="button"
          className="touch-target absolute right-1 top-1/2 inline-flex min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
          onClick={handleClear}
          aria-label="Wyczyść"
        >
          <X aria-hidden="true" size={18} />
        </button>
      ) : null}
    </span>
  );
}
