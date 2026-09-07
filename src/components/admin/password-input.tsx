"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type PasswordInputProps = {
  id?: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  maxLength?: number;
};

export function PasswordInput({ id, name, autoComplete, minLength, maxLength }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <span className="relative block"><input id={inputId} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 pr-12 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25" /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"} className="absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-brand-soft hover:text-brand-strong focus:outline-none focus:ring-2 focus:ring-brand/40">{visible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}</button></span>;
}
