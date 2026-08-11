"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, SearchCheck, X } from "lucide-react";
import type { ModerationStatus } from "@/generated/prisma/enums";
import {
  moderateSubmission,
  type ModerationActionState,
} from "@/app/admin/(protected)/zgloszenia/actions";
import type { AdminSubmissionKind } from "@/lib/admin/submissions";

const initialState: ModerationActionState = {};

function ModerationSubmit({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: "brand" | "neutral" | "urgent";
  icon: typeof Check;
}) {
  const { pending } = useFormStatus();
  const tones = {
    brand: "bg-brand text-[#10231e] hover:bg-brand-strong hover:text-white",
    neutral: "border border-brand bg-white text-brand-strong hover:bg-brand-soft",
    urgent: "border border-urgent bg-white text-[#8c2d0c] hover:bg-urgent-soft",
  };

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${tones[tone]}`}
    >
      <Icon aria-hidden="true" size={18} />
      {pending ? "Zapisywanie..." : label}
    </button>
  );
}

function ModerationForm({
  entityId,
  entityType,
  targetStatus,
}: {
  entityId: string;
  entityType: AdminSubmissionKind;
  targetStatus: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const [state, formAction] = useActionState(moderateSubmission, initialState);
  const config = {
    UNDER_REVIEW: {
      label: "Rozpocznij weryfikację",
      tone: "neutral" as const,
      icon: SearchCheck,
    },
    APPROVED: { label: "Zatwierdź", tone: "brand" as const, icon: Check },
    REJECTED: { label: "Odrzuć", tone: "urgent" as const, icon: X },
  }[targetStatus];

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="targetStatus" value={targetStatus} />
      {targetStatus === "APPROVED" ? (
        <label className="block text-sm font-bold">
          <span className="mb-2 block">Notatka moderatora <span className="font-normal text-muted-foreground">(opcjonalnie)</span></span>
          <textarea
            name="note"
            maxLength={2000}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
          />
        </label>
      ) : null}
      {targetStatus === "REJECTED" ? (
        <label className="block text-sm font-bold">
          <span className="mb-2 block">Powód odrzucenia</span>
          <textarea
            name="note"
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 font-normal outline-none focus:border-urgent focus:ring-2 focus:ring-urgent/20"
          />
        </label>
      ) : null}
      <ModerationSubmit label={config.label} tone={config.tone} icon={config.icon} />
      {state.error ? <p role="alert" className="text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm font-semibold text-brand-strong">{state.success}</p> : null}
    </form>
  );
}

export function ModerationPanel({
  entityId,
  entityType,
  status,
  moderatorNote,
  rejectionReason,
}: {
  entityId: string;
  entityType: AdminSubmissionKind;
  status: ModerationStatus;
  moderatorNote?: string | null;
  rejectionReason?: string | null;
}) {
  const isFinished = status === "APPROVED" || status === "REJECTED";

  return (
    <section className="rounded-lg border border-border bg-white p-5 lg:sticky lg:top-6">
      <h2 className="text-lg font-bold">Moderacja</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Zatwierdzenie nie publikuje jeszcze danych ani nie zmienia publicznego miejsca.
      </p>
      {isFinished ? (
        <div className="mt-5 rounded-lg bg-[#f5f3ed] p-4 text-sm leading-6">
          <p className="font-bold">Moderacja zakończona</p>
          {status === "APPROVED" && moderatorNote ? <p className="mt-2">{moderatorNote}</p> : null}
          {status === "REJECTED" && rejectionReason ? (
            <p className="mt-2"><strong>Powód:</strong> {rejectionReason}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {status === "PENDING" ? (
            <ModerationForm entityId={entityId} entityType={entityType} targetStatus="UNDER_REVIEW" />
          ) : null}
          <div className="border-t border-border pt-5">
            <ModerationForm entityId={entityId} entityType={entityType} targetStatus="APPROVED" />
          </div>
          <div className="border-t border-border pt-5">
            <ModerationForm entityId={entityId} entityType={entityType} targetStatus="REJECTED" />
          </div>
        </div>
      )}
    </section>
  );
}
