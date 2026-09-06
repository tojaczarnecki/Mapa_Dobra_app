import { prisma } from "@/lib/prisma";
import { NeedForm } from "./need-form";
import { AdminNeedsList } from "./admin-needs-list";

export async function AdminNeedsSection({ placeId }: { placeId: string }) {
  const needs = await prisma.organizationNeed.findMany({ where: { placeId, type: "VOLUNTEERS" }, include: { responses: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } });

  return <section className="rounded-lg border border-brand/30 bg-white p-4 sm:p-5" aria-labelledby="admin-needs-title">
    <h2 id="admin-needs-title" className="text-lg font-extrabold">Aktualne potrzeby</h2>
    <p className="mt-1 text-sm text-muted-foreground">Opublikuj prostą, aktualną potrzebę dla osób, które chcą pomóc.</p>
    <details className="mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-brand px-4 py-2 text-sm font-extrabold">+ Zgłoś potrzebę</summary>
      <div className="mt-4"><NeedForm placeId={placeId} /></div>
    </details>
    <AdminNeedsList placeId={placeId} needs={needs.map((need) => ({
      ...need,
      placeId: need.placeId,
      startsAt: need.startsAt.toISOString(),
      endsAt: need.endsAt.toISOString(),
      signupDeadline: need.signupDeadline?.toISOString() ?? null,
      responses: need.responses.map((response) => ({ ...response, createdAt: response.createdAt.toISOString(), updatedAt: response.updatedAt.toISOString() })),
    }))} />
  </section>;
}
