"use client";

import { MapPin, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { GeographicContext } from "@/lib/geocoding/geographic-context";
import { geographicContextToSearchParams } from "@/lib/geocoding/geographic-context";
import type { GeocodingSuggestion } from "@/lib/geocoding/results";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: GeocodingSuggestion) => void;
  geographicContext?: GeographicContext;
  disabled?: boolean;
  placeholder?: string;
};

export function formatLocationSuggestion(suggestion: GeocodingSuggestion) {
  const primary = [suggestion.road, suggestion.houseNumber].filter(Boolean).join(" ") || suggestion.displayName.split(",")[0];
  const secondary = [suggestion.postalCode, suggestion.city, suggestion.district].filter(Boolean).join(" · ") || suggestion.displayName.split(",").slice(1, 3).join(", ").trim();
  return { primary, secondary, value: [primary, secondary].filter(Boolean).join(", ") };
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  geographicContext,
  disabled = false,
  placeholder = "Zacznij wpisywać ulicę lub adres",
}: LocationAutocompleteProps) {
  const listboxId = `location-suggestions-${useId().replace(/:/gu, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedValueRef = useRef("");
  const requestSequenceRef = useRef(0);
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || query === selectedValueRef.current) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const sequence = ++requestSequenceRef.current;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setStatus("Szukam adresów…");
      const params = geographicContextToSearchParams(geographicContext);
      params.set("q", query);
      try {
        const response = await fetch(`/api/geocoding/autocomplete?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("AUTOCOMPLETE_FAILED");
        const result = await response.json() as { suggestions?: GeocodingSuggestion[] };
        if (sequence !== requestSequenceRef.current) return;
        const nextSuggestions = Array.isArray(result.suggestions) ? result.suggestions.slice(0, 7) : [];
        setSuggestions(nextSuggestions);
        setActiveIndex(-1);
        setIsOpen(true);
        setStatus(nextSuggestions.length ? `Znaleziono ${nextSuggestions.length} propozycji adresu.` : "Nie znaleźliśmy tego adresu. Możesz wpisać lokalizację ręcznie.");
      } catch {
        if (controller.signal.aborted || sequence !== requestSequenceRef.current) return;
        if (!navigator.onLine) {
          window.dispatchEvent(new Event("mapa-dobra:network-failure"));
        }
        setSuggestions([]);
        setIsOpen(true);
        setStatus(navigator.onLine
          ? "Nie udało się pobrać podpowiedzi. Nadal możesz wpisać adres ręcznie."
          : "Podpowiedzi wymagają połączenia. Możesz wpisać adres ręcznie.");
      } finally {
        if (!controller.signal.aborted && sequence === requestSequenceRef.current) setIsLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [geographicContext, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectedValueRef.current = "";
    onChange(event.target.value);
    setActiveIndex(-1);
    setIsOpen(event.target.value.trim().length >= 3);
  }

  function selectSuggestion(suggestion: GeocodingSuggestion) {
    const { value: formattedValue } = formatLocationSuggestion(suggestion);
    selectedValueRef.current = formattedValue;
    onChange(selectedValueRef.current);
    onSelect(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setStatus("Wybrano adres.");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || !suggestions.length) {
      if (event.key === "Escape") setIsOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
  const hasList = isOpen && (isLoading || suggestions.length > 0 || status.includes("Nie znaleźliśmy") || status.includes("Nie udało się"));

  return (
    <div ref={containerRef} className="location-autocomplete">
      <input
        className="location-autocomplete-input"
        value={value}
        onChange={handleChange}
        onFocus={() => { if (value.trim().length >= 3 && selectedValueRef.current !== value) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={hasList}
        aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
        aria-busy={isLoading}
        disabled={disabled}
        maxLength={500}
      />
      <p className="location-autocomplete-status" aria-live="polite">{status}</p>
      {hasList ? (
        <div id={listboxId} className="location-autocomplete-dropdown" role="listbox" aria-label="Podpowiedzi adresów">
          {isLoading ? <div className="location-autocomplete-loading"><LoaderCircle aria-hidden="true" size={18} />Szukam adresów…</div> : null}
          {!isLoading && suggestions.map((suggestion, index) => {
            const parts = formatLocationSuggestion(suggestion);
            return (
              <button
                key={suggestion.id}
                id={`${listboxId}-${suggestion.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className="location-autocomplete-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
              >
                <MapPin aria-hidden="true" size={19} />
                <span className="location-autocomplete-option-copy">
                  <strong>{parts.primary}</strong>
                  {parts.secondary ? <span>{parts.secondary}</span> : null}
                </span>
              </button>
            );
          })}
          {!isLoading && !suggestions.length && status ? <p className="location-autocomplete-empty">{status}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
