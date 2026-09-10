"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GuidedFlowActions, GuidedFlowProgress } from "@/components/forms/guided-flow-primitives";
import { conceptualHelpRequestProgress } from "@/lib/help-requests/progress";

type GuidedFlowShellProps = {
  step: number;
  total: number;
  onBack: () => void;
  canGoBack: boolean;
  children: ReactNode;
};

export function GuidedFlowShell({ step, total, onBack, canGoBack, children }: GuidedFlowShellProps) {
  const progressStep = total === 8 ? conceptualHelpRequestProgress(step, canGoBack) : step;
  const progressTotal = total === 8 ? 5 : total;

  return (
    <main className="guided-flow-shell" aria-label="Przekazywanie informacji">
      <div className="guided-flow-shell-topbar">
        <Link href="/pomagam" className="guided-flow-close">← Zamknij</Link>
        <GuidedFlowProgress current={progressStep} total={progressTotal} />
      </div>
      <div className="guided-flow-content">{children}</div>
      <GuidedFlowActions onBack={onBack} canGoBack={canGoBack} />
    </main>
  );
}
