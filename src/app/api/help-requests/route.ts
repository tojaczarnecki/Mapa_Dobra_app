import { prisma } from "@/lib/prisma";
import { getRequestAddress, consumeSubmissionRateLimit } from "@/lib/submissions/rate-limit";
import { readSubmissionBody, submissionErrorResponse } from "@/lib/submissions/http";
import { validateHelpRequest } from "@/lib/help-requests/validation";
import { publicWriteBlockedResponse } from "@/lib/system/public-guard";

function helpRequestErrorResponse(status: number, message: string) {
  return Response.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const blockedResponse = await publicWriteBlockedResponse();
  if (blockedResponse) return blockedResponse;
  const address = getRequestAddress(request);
  const limit = await consumeSubmissionRateLimit(`help-request:${address}`);
  if (!limit.allowed) {
    const response = helpRequestErrorResponse(429, "Wysłano zbyt wiele zgłoszeń w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.");
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
  const validation = validateHelpRequest(body);
  if (!validation.ok) return helpRequestErrorResponse(400, validation.reason);

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
