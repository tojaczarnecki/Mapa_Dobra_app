"use client";

import { X } from "lucide-react";
import { useId, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { normalizeTokenValues, splitTokenInput } from "@/lib/token-values";

type TokenInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helperText?: string;
};

export function TokenInput({ label, values, onChange, placeholder = "Wpisz i naciśnij Enter", helperText = "Wpisz pozycję i naciśnij Enter." }: TokenInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const tokens = normalizeTokenValues(values);

  function commitMany(rawValues: string[]) {
    const next = normalizeTokenValues([...tokens, ...rawValues]);
    if (next.length !== tokens.length || next.some((value, index) => value !== tokens[index])) onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitMany(splitTokenInput(draft));
    } else if (event.key === "Backspace" && !draft && tokens.length) {
      onChange(tokens.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!/[\n,]/u.test(pasted)) return;
    event.preventDefault();
    commitMany(splitTokenInput(pasted));
  }

  function handleBlur() {
    if (draft.trim()) commitMany([draft]);
  }

  return (
    <div className="block text-sm font-bold">
      <label htmlFor={inputId} className="mb-1.5 block">{label}</label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
        {tokens.map((token) => (
          <span key={token.toLocaleLowerCase("pl-PL")} className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md bg-brand-soft px-2 text-sm font-semibold text-brand-strong">
            <span className="min-w-0 break-words">{token}</span>
            <button type="button" aria-label={`Usuń: ${token}`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded p-1 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" onClick={() => onChange(tokens.filter((item) => item !== token))}>
              <X aria-hidden="true" size={14} />
            </button>
          </span>
        ))}
        <input id={inputId} className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none" value={draft} maxLength={240} placeholder={tokens.length ? "Dodaj kolejną" : placeholder} aria-describedby={helperId} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} onBlur={handleBlur} />
      </div>
      <p id={helperId} className="mt-1 text-xs font-normal text-muted-foreground">{helperText}</p>
    </div>
  );
}
