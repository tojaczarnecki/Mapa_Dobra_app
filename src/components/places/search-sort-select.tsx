"use client";

import { useRouter } from "next/navigation";

export function SearchSortSelect({ value, queryString }: { value: string; queryString: string }) {
  const router = useRouter();

  return (
    <select
      aria-label="Sortuj wyniki"
      className="compact-select rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-bold text-foreground shadow-sm focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/35"
      value={value}
      onChange={(event) => {
        const params = new URLSearchParams(queryString);
        if (event.target.value === "best") params.delete("sort");
        else params.set("sort", event.target.value);
        const next = params.toString();
        router.push(next ? `/szukaj?${next}` : "/szukaj");
      }}
    >
      <option value="best">Najlepiej dopasowane</option>
      <option value="distance">Najbliżej</option>
      <option value="open">Otwarte teraz</option>
    </select>
  );
}
