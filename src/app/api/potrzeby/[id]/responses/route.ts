import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestAddress, consumeSubmissionRateLimit } from "@/lib/submissions/rate-limit";
import { readSubmissionBody } from "@/lib/submissions/http";
import { validateVolunteerResponse, remainingPeople } from "@/lib/needs/validation";
import { resolveNeedSignupAvailability } from "@/lib/needs/availability";
import { hasDuplicateVolunteerResponse, isResponseFormTooFast, TURNSTILE_ERROR_MESSAGE, verifyTurnstileToken } from "@/lib/needs/anti-spam";
import { publicWriteBlockedResponse } from "@/lib/system/public-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blockedResponse = await publicWriteBlockedResponse();
  if (blockedResponse) return blockedResponse;
  const address = getRequestAddress(request);
  const limit = await consumeSubmissionRateLimit(`volunteer-need:${address}`);
  if (!limit.allowed) return NextResponse.json({ ok: false, message: "Spróbuj ponownie za chwilę." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await readSubmissionBody(request);
  if (body && typeof body === "object" && "honeypot" in body && typeof body.honeypot === "string" && body.honeypot.trim()) return NextResponse.json({ ok: false, message: "Nie udało się wysłać zgłoszenia." }, { status: 400 });
  const submitted = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if (isResponseFormTooFast(submitted.formStartedAt)) return NextResponse.json({ ok: false, message: "Odczekaj chwilę i spróbuj ponownie." }, { status: 400 });
  if (!await verifyTurnstileToken(submitted.turnstileToken, address)) return NextResponse.json({ ok: false, message: TURNSTILE_ERROR_MESSAGE }, { status: 400 });
  const validation = validateVolunteerResponse(body);
  if (!validation.ok) return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });
  const { id } = await params;
  try {
    await prisma.$transaction(async (transaction) => {
      const now = new Date();
      const need = await transaction.organizationNeed.findFirst({
        where: { id, type: "VOLUNTEERS" },
        include: { responses: { where: { status: "CONFIRMED" }, select: { id: true } } },
      });
      if (!need) throw new Error("NEED_NOT_ACTIVE");

      const signup = resolveNeedSignupAvailability(need, now);
      if (!signup.open) {
        if (signup.reason === "SIGNUP_DEADLINE_PASSED") throw new Error("SIGNUP_CLOSED");
        throw new Error("NEED_NOT_ACTIVE");
      }

      if (remainingPeople(need.peopleNeeded, need.responses.length) < 1) throw new Error("NEED_FULL");
      const activeResponses = await transaction.volunteerNeedResponse.findMany({ where: { needId: need.id, status: { in: ["NEW", "CONFIRMED"] } }, select: { phone: true, email: true } });
      if (hasDuplicateVolunteerResponse(activeResponses, validation.data)) throw new Error("DUPLICATE_RESPONSE");
      await transaction.volunteerNeedResponse.create({ data: { needId: need.id, ...validation.data } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "SIGNUP_CLOSED") return NextResponse.json({ ok: false, message: "Zapisy do tej potrzeby zostały zakończone." }, { status: 409 });
    if (error instanceof Error && error.message === "NEED_NOT_ACTIVE") return NextResponse.json({ ok: false, message: "Ta potrzeba nie jest już aktywna." }, { status: 404 });
    if (error instanceof Error && error.message === "NEED_FULL") return NextResponse.json({ ok: false, message: "Mamy już komplet osób." }, { status: 409 });
    if (error instanceof Error && error.message === "DUPLICATE_RESPONSE") return NextResponse.json({ ok: false, message: "Wygląda na to, że masz już zgłoszenie do tej potrzeby." }, { status: 409 });
    return NextResponse.json({ ok: false, message: "Nie udało się wysłać zgłoszenia." }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, message: "Ta informacja nie jest dostępna publicznie." }, { status: 404 });
}
