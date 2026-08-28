"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getHomeSuggestions, type HomeSearchCategory } from "@/lib/home/autosuggest";
import type { PublicSearchPlace } from "@/lib/places/search";

type HomeSearchAutocompleteProps = {
  categories: HomeSearchCategory[];
  places: PublicSearchPlace[];
};

export function HomeSearchAutocomplete({ categories, places }: HomeSearchAutocompleteProps) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => getHomeSuggestions(query, categories, places), [categories, places, query]);
  const activeSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : undefined;

  function goToSuggestion(href: string) {
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
    } else if (event.key === "Enter" && isOpen && activeSuggestion) {
      event.preventDefault();
      goToSuggestion(activeSuggestion.href);
    }
  }

  function clearQuery() {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  const hasSuggestions = isOpen && suggestions.length > 0;

  return (
    <form action="/mapa" method="get" className="home-search-form" aria-label="Wyszukiwarka pomocy">
      <input type="hidden" name="lokalizacja" value="moja" />
      <label htmlFor="home-search" className="sr-only">Czego potrzebujesz?</label>
      <div className="home-search-autocomplete">
        <div className="home-search-field">
          <Search aria-hidden="true" className="shrink-0" size={23} strokeWidth={2.1} />
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder="Np. gdzie dostanę dzisiaj jedzenie?"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={hasSuggestions}
            aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
            value={query}
            ref={inputRef}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setIsOpen(event.target.value.trim().length >= 2);
            }}
            onFocus={() => setIsOpen(query.trim().length >= 2)}
            onKeyDown={handleKeyDown}
          />
          {query ? <button type="button" className="home-search-clear" aria-label="Wyczyść wyszukiwanie" onClick={clearQuery}><X aria-hidden="true" size={19} /></button> : null}
        </div>
        {hasSuggestions ? (
          <ul id={listboxId} className="home-search-suggestions" role="listbox" aria-label="Podpowiedzi wyszukiwania">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listboxId}-${suggestion.id}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  className="home-search-suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goToSuggestion(suggestion.href)}
                >
                  <span className="home-search-suggestion-label">{suggestion.label}</span>
                  <span className="home-search-suggestion-kind">{suggestion.secondary}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
