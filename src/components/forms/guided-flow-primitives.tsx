import type { ReactNode, RefObject } from "react";
import { ArrowLeft } from "lucide-react";

export function GuidedFlowProgress({ current, total }: { current: number; total: number }) {
  return <div className="guided-flow-progress" aria-label={`Ekran ${current} z ${total}`}><span>{current} z {total}</span><span className="guided-flow-progress-dots" aria-hidden="true">{Array.from({ length: total }, (_, index) => <i key={index} className={index < current ? "is-current" : undefined} />)}</span></div>;
}

export function GuidedFlowQuestion({ eyebrow, title, description, headingRef, children, className = "" }: { eyebrow: string; title: string; description?: string; headingRef?: RefObject<HTMLHeadingElement | null>; children?: ReactNode; className?: string }) {
  return <section className={`guided-flow-question ${className}`}><p className="guided-flow-eyebrow">{eyebrow}</p><h1 ref={headingRef} tabIndex={-1}>{title}</h1>{description ? <p>{description}</p> : null}{children}</section>;
}

export function GuidedFlowOption({ selected, children, onClick, tone = "default" }: { selected?: boolean; children: ReactNode; onClick: () => void; tone?: "default" | "danger" }) {
  return <button type="button" className={`guided-flow-choice ${selected ? "is-selected" : ""} ${tone === "danger" ? "is-danger" : ""}`} aria-pressed={selected} onClick={onClick}>{children}<span aria-hidden="true" className="guided-flow-choice-mark">{selected ? "✓" : "○"}</span></button>;
}

export function GuidedFlowActions({ onBack, canGoBack }: { onBack: () => void; canGoBack: boolean }) {
  return <nav className="guided-flow-navigation" aria-label="Nawigacja formularza"><button type="button" className="guided-flow-back" onClick={onBack} disabled={!canGoBack}><ArrowLeft aria-hidden="true" size={18} /> Wstecz</button></nav>;
}
