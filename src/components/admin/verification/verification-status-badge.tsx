const labels = {
  PENDING: "Wymaga weryfikacji",
  IN_PROGRESS: "W trakcie",
  CONTACT_REQUIRED: "Wymaga kontaktu",
  READY: "Gotowe do publikacji",
  VERIFIED: "Zweryfikowane",
  SKIPPED: "Pominięte",
} as const;

export function VerificationStatusBadge({ status }: { status: keyof typeof labels }) {
  const tone = status === "READY" || status === "VERIFIED"
    ? "border-brand/40 bg-brand-soft text-[#075f53]"
    : status === "SKIPPED"
      ? "border-border bg-[#efede7] text-muted-foreground"
      : status === "IN_PROGRESS" || status === "CONTACT_REQUIRED"
        ? "border-[#d7a548] bg-[#fff4d8] text-[#684500]"
        : "border-urgent/35 bg-urgent-soft/50 text-[#8b2d0b]";
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{labels[status]}</span>;
}
