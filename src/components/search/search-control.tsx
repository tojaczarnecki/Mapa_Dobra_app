import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { ClearableSearchInput } from "@/components/ui/clearable-search-input";

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
}: SearchControlProps) {
  return (
    <form action={action} method="get" className={`search-control search-control-${variant}`} aria-label={label}>
      {hiddenFields}
      <label htmlFor={id}>{label}</label>
      <div className="search-control-field">
        <Search aria-hidden="true" className="search-control-icon" size={22} strokeWidth={2.2} />
        <ClearableSearchInput
          id={id}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="search-control-input"
        />
        {trailing}
      </div>
      <button type="submit" className="sr-only">Szukaj pomocy</button>
    </form>
  );
}
