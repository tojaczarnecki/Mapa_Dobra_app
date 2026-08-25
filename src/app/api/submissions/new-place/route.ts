import { prisma } from "@/lib/prisma";
import {
  readSubmissionBody,
  submissionErrorResponse,
  submissionSuccessResponse,
} from "@/lib/submissions/http";
import { toNewPlaceCreateData } from "@/lib/submissions/prisma-mappers";
import {
  consumeSubmissionRateLimit,
  getRequestAddress,
} from "@/lib/submissions/rate-limit";
import { validateNewPlaceSubmission } from "@/lib/submissions/validation";
import { getCurrentAdmin } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimit = await consumeSubmissionRateLimit(
    `new-place:${getRequestAddress(request)}`,
  );

  if (!rateLimit.allowed) {
    const response = submissionErrorResponse(429);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const body = await readSubmissionBody(request);
  const validation = validateNewPlaceSubmission(body);
  if (!validation.ok) {
    return submissionErrorResponse();
  }

  if (validation.data.organizationId) {
    const session = await getCurrentAdmin();
    const membership = session
      ? await prisma.organizationMembership.findUnique({ where: { organizationId_adminUserId: { organizationId: validation.data.organizationId, adminUserId: session.user.id } }, select: { status: true } })
      : null;
    if (!membership || membership.status !== "ACTIVE") return submissionErrorResponse(403);
  }

  try {
    const existing = await prisma.newPlaceSubmission.findUnique({
      where: { requestId: validation.data.requestId },
      select: { id: true, moderationStatus: true },
    });

    if (existing) {
      return submissionSuccessResponse(existing, 200);
    }

    const submission = await prisma.newPlaceSubmission.create({
      data: toNewPlaceCreateData(validation.data),
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
      const duplicate = await prisma.newPlaceSubmission.findUnique({
        where: { requestId: validation.data.requestId },
        select: { id: true, moderationStatus: true },
      });
      if (duplicate) return submissionSuccessResponse(duplicate, 200);
    }

    console.error("Failed to save a new place submission.");
    return submissionErrorResponse(500);
  }
}
