"use client";

import { useRouter } from "next/navigation";

export function SearchSortSelect({ value, queryString }: { value: string; queryString: string }) {
  const router = useRouter();

  return (
    <select
      aria-label="Sortuj wyniki"
      className="compact-select"
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
