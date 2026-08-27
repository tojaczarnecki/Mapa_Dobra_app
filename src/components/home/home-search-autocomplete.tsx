"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
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
  const suggestions = useMemo(() => getHomeSuggestions(query, categories, places), [categories, places, query]);
  const activeSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
  const intentSuggestion = suggestions.find((suggestion) => suggestion.secondary === "Najlepsze dopasowanie");

  function goToSuggestion(href: string) {
    window.location.assign(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!intentSuggestion) return;
    event.preventDefault();
    goToSuggestion(intentSuggestion.href);
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

  const hasSuggestions = isOpen && suggestions.length > 0;

  return (
    <form action="/szukaj" method="get" className="home-search-form" aria-label="Wyszukiwarka pomocy" onSubmit={handleSubmit}>
      <label htmlFor="home-search" className="sr-only">Czego potrzebujesz?</label>
      <div className="home-search-autocomplete">
        <div className="home-search-field">
          <input
            id="home-search"
            name="q"
            type="search"
            placeholder="Np. gdzie zjem ciepły posiłek teraz?"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={hasSuggestions}
            aria-activedescendant={activeSuggestion ? `${listboxId}-${activeSuggestion.id}` : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setIsOpen(event.target.value.trim().length >= 2);
            }}
            onFocus={() => setIsOpen(query.trim().length >= 2)}
            onKeyDown={handleKeyDown}
          />
          <Search aria-hidden="true" className="shrink-0" size={20} strokeWidth={2.1} />
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
