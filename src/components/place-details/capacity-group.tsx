import type { CapacityGroupDetails } from "@/data/demo-place-details";

type CapacityGroupProps = {
  group: CapacityGroupDetails;
};

export function CapacityGroup({ group }: CapacityGroupProps) {
  const hasNumbers = typeof group.free === "number" && typeof group.total === "number";

  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-extrabold text-foreground">
          {group.label}
        </p>
        {hasNumbers ? (
          <p className="shrink-0 text-sm font-extrabold text-foreground">
            {group.free} wolne / {group.total}
          </p>
        ) : null}
      </div>
      {group.note ? (
        <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
          {group.note}
        </p>
      ) : null}
    </div>
  );
}
