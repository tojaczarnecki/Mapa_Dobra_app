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

export function GuidedFlowShell({ step, total, onBack, canGoBack, children }: GuidedFlowShellProps) {
  return (
    <main className="guided-flow-shell" aria-label="Przekazywanie informacji">
      <div className="guided-flow-shell-topbar">
        <Link href="/pomagam" className="guided-flow-close">← Zamknij</Link>
        <GuidedFlowProgress current={step} total={total} />
      </div>
      <div className="guided-flow-content">{children}</div>
      <GuidedFlowActions onBack={onBack} canGoBack={canGoBack} />
    </main>
  );
}
