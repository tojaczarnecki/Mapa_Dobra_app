import { prisma } from "@/lib/prisma";
import {
  readSubmissionBody,
  submissionErrorResponse,
  submissionSuccessResponse,
} from "@/lib/submissions/http";
import { toPlaceUpdateCreateData } from "@/lib/submissions/prisma-mappers";
import {
  consumeSubmissionRateLimit,
  getRequestAddress,
} from "@/lib/submissions/rate-limit";
import { validatePlaceUpdateSubmission } from "@/lib/submissions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimit = consumeSubmissionRateLimit(
    `place-update:${getRequestAddress(request)}`,
  );

  if (!rateLimit.allowed) {
    const response = submissionErrorResponse(429);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
  const validation = validatePlaceUpdateSubmission(body);
  if (!validation.ok) {
    return submissionErrorResponse();
  }

  try {
    const existing = await prisma.placeUpdateSubmission.findUnique({
      where: { requestId: validation.data.requestId },
      select: { id: true, moderationStatus: true },
    });

    if (existing) {
      return submissionSuccessResponse(existing, 200);
    }

    const submission = await prisma.placeUpdateSubmission.create({
      data: toPlaceUpdateCreateData(validation.data),
      select: { id: true, moderationStatus: true },
    });
    return submissionSuccessResponse(submission);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.placeUpdateSubmission.findUnique({
        where: { requestId: validation.data.requestId },
        select: { id: true, moderationStatus: true },
      });
      if (duplicate) return submissionSuccessResponse(duplicate, 200);
    }

    console.error("Failed to save a place update submission.");
    return submissionErrorResponse(500);
  }
}
