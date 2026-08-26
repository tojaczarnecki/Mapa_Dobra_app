import { NextResponse } from "next/server";
import { getTrustedClientAddress, createApplicationRateLimiter } from "@/lib/security/rate-limiter";
import { requirePermission } from "@/lib/admin/session";
import { GusLookupError, lookupGusByNip } from "@/lib/organizations/gus-client";
import { normalizeNip } from "@/lib/structured-data";

const limiter = createApplicationRateLimiter(15 * 60 * 1000, 12);

export async function GET(request: Request) {
  const session = await requirePermission("MANAGE_ORGANIZATIONS");
  const nip = normalizeNip(new URL(request.url).searchParams.get("nip") ?? "");
  if (!nip) return NextResponse.json({ ok: false, code: "INVALID_NIP", message: "Podaj poprawny NIP." }, { status: 400 });
  const rate = await limiter.consume(`gus:${session.user.id}:${getTrustedClientAddress(request.headers)}`);
  if (!rate.allowed) return NextResponse.json({ ok: false, code: "RATE_LIMITED", message: "Spróbuj ponownie za chwilę." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  try { return NextResponse.json({ ok: true, data: await lookupGusByNip(nip) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) {
    const code = error instanceof GusLookupError ? error.code : "PROVIDER";
    if (code === "NOT_FOUND") return NextResponse.json({ ok: false, code, message: "Nie znaleźliśmy podmiotu dla tego NIP." }, { status: 404 });
    if (code === "NOT_CONFIGURED") return NextResponse.json({ ok: false, code, message: "Automatyczne pobieranie danych jest obecnie niedostępne." }, { status: 503 });
    if (code === "TIMEOUT") return NextResponse.json({ ok: false, code, message: "Nie udało się pobrać danych z GUS. Możesz uzupełnić dane ręcznie." }, { status: 504 });
    return NextResponse.json({ ok: false, code: "PROVIDER", message: "Nie udało się pobrać danych z GUS. Możesz uzupełnić dane ręcznie." }, { status: 503 });
  }
}
