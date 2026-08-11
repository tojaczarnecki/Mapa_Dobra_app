import type { ModerationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  categoryLabels,
  sourceTypeLabels,
  updateTypeLabels,
} from "@/lib/admin/labels";

export type AdminSubmissionKind = "place-update" | "new-place";

export type AdminSubmissionSummary = {
  id: string;
  kind: AdminSubmissionKind;
  typeLabel: string;
  name: string;
  subject: string;
  source: string | null;
  createdAt: Date;
  status: ModerationStatus;
};

export type SubmissionFilters = {
  status?: ModerationStatus;
  kind?: AdminSubmissionKind;
  sort: "newest" | "oldest";
};

const summaryOrderSelect = {
  id: true,
  moderationStatus: true,
  sourceType: true,
  createdAt: true,
} as const;

export async function getSubmissionSummaries({
  status,
  kind,
  sort,
}: SubmissionFilters) {
  const orderBy = { createdAt: sort === "oldest" ? "asc" : "desc" } as const;
  const where = status ? { moderationStatus: status } : undefined;

  const [updates, newPlaces] = await Promise.all([
    kind === "new-place"
      ? Promise.resolve([])
      : prisma.placeUpdateSubmission.findMany({
          where,
          orderBy,
          select: {
            ...summaryOrderSelect,
            placeNameSnapshot: true,
            submissionTypes: true,
          },
        }),
    kind === "place-update"
      ? Promise.resolve([])
      : prisma.newPlaceSubmission.findMany({
          where,
          orderBy,
          select: {
            ...summaryOrderSelect,
            name: true,
            categories: true,
          },
        }),
  ]);

  const items: AdminSubmissionSummary[] = [
    ...updates.map((submission) => ({
      id: submission.id,
      kind: "place-update" as const,
      typeLabel: "Zmiana miejsca",
      name: submission.placeNameSnapshot,
      subject: submission.submissionTypes.map((type) => updateTypeLabels[type]).join(", "),
      source: submission.sourceType ? sourceTypeLabels[submission.sourceType] : null,
      createdAt: submission.createdAt,
      status: submission.moderationStatus,
    })),
    ...newPlaces.map((submission) => ({
      id: submission.id,
      kind: "new-place" as const,
      typeLabel: "Nowe miejsce",
      name: submission.name,
      subject: submission.categories.map((category) => categoryLabels[category]).join(", "),
      source: submission.sourceType ? sourceTypeLabels[submission.sourceType] : null,
      createdAt: submission.createdAt,
      status: submission.moderationStatus,
    })),
  ];

  return items.sort((left, right) => {
    const difference = left.createdAt.getTime() - right.createdAt.getTime();
    return sort === "oldest" ? difference : -difference;
  });
}

export async function getDashboardData() {
  const statuses = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
  const [updateGroups, newPlaceGroups, latest] = await Promise.all([
    prisma.placeUpdateSubmission.groupBy({
      by: ["moderationStatus"],
      _count: { _all: true },
    }),
    prisma.newPlaceSubmission.groupBy({
      by: ["moderationStatus"],
      _count: { _all: true },
    }),
    getSubmissionSummaries({ sort: "newest" }),
  ]);

  const countFor = (
    groups: Array<{ moderationStatus: ModerationStatus; _count: { _all: number } }>,
    status: ModerationStatus,
  ) => groups.find((group) => group.moderationStatus === status)?._count._all ?? 0;

  return {
    metrics: statuses.map((status) => {
      const placeUpdates = countFor(updateGroups, status);
      const newPlaces = countFor(newPlaceGroups, status);
      return { status, placeUpdates, newPlaces, total: placeUpdates + newPlaces };
    }),
    latest: latest.slice(0, 6),
  };
}

export async function getSubmissionDetail(id: string) {
  const [placeUpdate, newPlace] = await Promise.all([
    prisma.placeUpdateSubmission.findUnique({
      where: { id },
      include: {
        moderatedBy: {
          select: { displayName: true },
        },
      },
    }),
    prisma.newPlaceSubmission.findUnique({
      where: { id },
      include: {
        moderatedBy: {
          select: { displayName: true },
        },
      },
    }),
  ]);

  if (placeUpdate) return { kind: "place-update" as const, submission: placeUpdate };
  if (newPlace) return { kind: "new-place" as const, submission: newPlace };
  return null;
}
