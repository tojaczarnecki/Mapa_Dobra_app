"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GeocodingSuggestion } from "@/lib/geocoding/results";
import { formatSuggestionAddress } from "@/lib/geocoding/autocomplete";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: GeocodingSuggestion) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
};

export function LocationAutocomplete({ value, onChange, onSelect, className, disabled, required, placeholder }: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const listId = useId();
  const requestId = useRef(0);
  const userEdited = useRef(false);
  const skipNextQuery = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userEdited.current) return;
    if (skipNextQuery.current) {
      skipNextQuery.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      const timer = window.setTimeout(() => {
        setSuggestions([]);
        setOpen(false);
        setMessage("");
        setIsLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setMessage("Szukam adresów…");
      try {
        const response = await fetch(`/admin/api/geocoding/autocomplete?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json() as { suggestions?: GeocodingSuggestion[]; message?: string };
        if (currentRequest !== requestId.current) return;
        setSuggestions(result.suggestions ?? []);
        setOpen(Boolean(result.suggestions?.length));
        setActiveIndex(-1);
        setMessage(result.message ?? (result.suggestions?.length ? "" : "Nie znaleziono adresu. Możesz wpisać go ręcznie."));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (currentRequest === requestId.current) {
          setSuggestions([]);
          setOpen(false);
          setMessage("Automatyczne podpowiedzi są niedostępne. Możesz wpisać adres ręcznie.");
        }
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: GeocodingSuggestion) {
    skipNextQuery.current = true;
    onSelect(suggestion);
    setSuggestions([]);
    setOpen(false);
    setMessage("");
    requestId.current += 1;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) {
      if (event.key === "Escape") setMessage("");
      return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => (index + 1) % suggestions.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1)); }
    if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); selectSuggestion(suggestions[activeIndex]); }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActiveIndex(-1); }
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        ref={inputRef}
        className={className}
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        onChange={(event) => { userEdited.current = true; onChange(event.target.value); }}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button type="button" className="min-h-11 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-brand-soft focus:bg-brand-soft focus:outline-none" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(suggestion)}>
                {formatSuggestionAddress(suggestion)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isLoading || message ? <p className="mt-1 text-xs font-normal text-muted-foreground" role="status" aria-live="polite">{isLoading ? "Szukam adresów…" : message}</p> : null}
    </div>
  );
}
