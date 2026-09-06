"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { ClearableSearchInput } from "@/components/ui/clearable-search-input";
import { getSmartSearchSuggestions } from "@/lib/places/search-intent";
import type { SmartSearchPlace } from "@/lib/places/search-intent";

type SearchControlProps = {
  action: string;
  id: string;
  label: string;
  name?: string;
  defaultValue?: string;
  placeholder: string;
  variant?: "landing" | "results";
  hiddenFields?: ReactNode;
  trailing?: ReactNode;
  categories?: Array<{ label: string; slug: string }>;
  places?: SmartSearchPlace[];
};

export function SearchControl({
  action,
  id,
  label,
  name = "q",
  defaultValue,
  placeholder,
  variant = "results",
  hiddenFields,
  trailing,
  categories,
  places,
}: SearchControlProps) {
  const listboxId = useId();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(() => getSmartSearchSuggestions(query, { categories, places }), [categories, places, query]);
  const hasSuggestions = isOpen && query.trim().length >= 2 && suggestions.length > 0;
  const activeSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : undefined;

  function chooseSuggestion(href: string) {
    window.location.assign(href);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Enter" && hasSuggestions && activeSuggestion) {
      event.preventDefault();
      chooseSuggestion(activeSuggestion.href);
    }
  }

  return (
    <form action={action} method="get" className={`search-control search-control-${variant}`} aria-label={label}>
      {hiddenFields}
      <label htmlFor={id}>{label}</label>
      <div className="search-control-field" role="search">
        <Search aria-hidden="true" className="search-control-icon" size={22} strokeWidth={2.2} />
        <ClearableSearchInput
          id={id}
          name={name}
          value={query}
          placeholder={placeholder}
          className="search-control-input"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={hasSuggestions}
          aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setIsOpen(event.target.value.trim().length >= 2);
          }}
          onClear={() => {
            setQuery("");
            setActiveIndex(-1);
            setIsOpen(false);
          }}
          onFocus={() => setIsOpen(query.trim().length >= 2)}
          onKeyDown={handleKeyDown}
        />
        {trailing}
        {hasSuggestions ? (
          <ul id={listboxId} className="search-control-suggestions" role="listbox" aria-label="Podpowiedzi wyszukiwania">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.id} id={`${listboxId}-${suggestion.id}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className="search-control-suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(suggestion.href)}
                >
                  <span className="search-control-suggestion-copy">
                    <strong>{suggestion.label}</strong>
                    <small>{suggestion.description}</small>
                  </span>
                  <span className="search-control-suggestion-kind">{suggestion.group}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button type="submit" className="sr-only">Szukaj pomocy</button>
    </form>
  );
}
