import { prisma } from "@/lib/prisma";
import { getRequestAddress, consumeSubmissionRateLimit } from "@/lib/submissions/rate-limit";
import { readSubmissionBody, submissionErrorResponse } from "@/lib/submissions/http";
import { validateHelpRequest } from "@/lib/help-requests/validation";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(request: Request) {
  const address = getRequestAddress(request);
  const limit = await consumeSubmissionRateLimit(`help-request:${address}`, Date.now(), "help");
  if (!limit.allowed) {
    const response = submissionErrorResponse(429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
  const challenge = await verifyTurnstileToken(body && typeof body === "object" ? (body as Record<string, unknown>).turnstileToken : undefined, request);
  if (!challenge.ok && challenge.reason !== "unavailable") return submissionErrorResponse(403);
  const validation = validateHelpRequest(body);
  if (!validation.ok) return submissionErrorResponse(400);

  try {
    const record = await prisma.helpRequest.create({ data: validation.data });
    return Response.json(
      { ok: true, id: record.id, status: record.status },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return submissionErrorResponse(500);
  }
}

export function GET() {
  return Response.json(
    { ok: false, message: "Ta informacja nie jest dostępna publicznie." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
