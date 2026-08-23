import { prisma } from "@/lib/prisma";
import { getRequestAddress, consumeSubmissionRateLimit } from "@/lib/submissions/rate-limit";
import { readSubmissionBody, submissionErrorResponse } from "@/lib/submissions/http";
import { validateHelpRequest } from "@/lib/help-requests/validation";

export async function POST(request: Request) {
  const address = getRequestAddress(request);
  const limit = await consumeSubmissionRateLimit(`help-request:${address}`);
  if (!limit.allowed) {
    const response = submissionErrorResponse(429);
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
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
