const MAX_REQUEST_BYTES = 64 * 1024;

export async function readSubmissionBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return undefined;
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return undefined;
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > MAX_REQUEST_BYTES) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return undefined;
  }
}

export function submissionErrorResponse(status = 400) {
  return Response.json(
    {
      ok: false,
      message: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function submissionSuccessResponse(
  record: { id: string; moderationStatus: string },
  status = 201,
) {
  return Response.json(
    {
      ok: true,
      id: record.id,
      moderationStatus: record.moderationStatus,
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
