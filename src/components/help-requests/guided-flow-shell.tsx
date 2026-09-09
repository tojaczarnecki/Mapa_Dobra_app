"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GuidedFlowActions, GuidedFlowProgress } from "@/components/forms/guided-flow-primitives";

type GuidedFlowShellProps = {
  step: number;
  total: number;
  onBack: () => void;
  canGoBack: boolean;
  children: ReactNode;
};

function conceptualProgress(screen: number, canGoBack: boolean) {
  if (screen <= 1) return 1;
  if (screen >= 2 && screen <= 4) return 2;
  if (screen === 5) return 3;
  if (screen === 6) return 4;
  if (screen === 7) return 5;
  // Screen 8 is used both for confirming a geolocated point and for the final success state.
  return canGoBack ? 2 : 5;
}

export function GuidedFlowShell({ step, total, onBack, canGoBack, children }: GuidedFlowShellProps) {
  const progressStep = total === 8 ? conceptualProgress(step, canGoBack) : step;
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
