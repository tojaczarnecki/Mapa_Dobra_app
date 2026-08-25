"use client";

import { useState } from "react";
import { requestPlaceAccess } from "@/app/dla-organizacji/dostep/actions";
import { useTurnstileToken } from "@/components/security/turnstile-token";

export function PlaceAccessForm({ placeId }: { placeId: string }) {
  const turnstile = useTurnstileToken();
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    try {
      formData.set("turnstileToken", await turnstile.requestToken());
    } catch {
      setError("Nie udało się wysłać prośby. Spróbuj ponownie.");
      return;
    }
    return requestPlaceAccess(formData);
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      <input type="hidden" name="placeId" value={placeId} />
      <label className="block text-sm font-semibold">Skąd wynika Twoje powiązanie z placówką?<textarea name="message" className="mt-1 min-h-28 w-full rounded-lg border border-border px-3 py-2 font-normal" maxLength={1000} /></label>
      {error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{error}</p> : null}
      <button className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 font-bold">Wyślij prośbę</button>
    </form>
  );
}
