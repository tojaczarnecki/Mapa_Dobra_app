"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { normalizeTokenValues } from "../../lib/token-values";

type TokenInputProps = { label: string; values: string[]; onChange: (values: string[]) => void; placeholder?: string };

export function TokenInput({ label, values, onChange, placeholder = "Wpisz i naciśnij Enter" }: TokenInputProps) {
  const [draft, setDraft] = useState("");
  const tokens = normalizeTokenValues(values);
  function commit(value: string) {
    const next = normalizeTokenValues([...tokens, value]);
    if (next.length !== tokens.length) onChange(next);
    setDraft("");
  }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); commit(draft); }
    else if (event.key === "Backspace" && !draft && tokens.length) onChange(tokens.slice(0, -1));
  }
  return (
    <div className="block text-sm font-bold">
      <span className="mb-1.5 block">{label}</span>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5">
        {tokens.map((token) => (
          <span key={token.toLocaleLowerCase("pl-PL")} className="inline-flex min-h-8 items-center gap-1 rounded-md bg-brand-soft px-2 text-sm font-semibold text-brand-strong">
            {token}
            <button type="button" aria-label={`Usuń ${token}`} className="rounded p-1 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => onChange(tokens.filter((item) => item !== token))}><X aria-hidden="true" size={14} /></button>
          </span>
        ))}
        <input className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none" value={draft} placeholder={tokens.length ? "Dodaj kolejną" : placeholder} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} />
      </div>
    </div>
  );
}
