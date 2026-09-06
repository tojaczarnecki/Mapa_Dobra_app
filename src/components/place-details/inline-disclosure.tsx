"use client";

import { useId, useState, type ReactNode } from "react";

type InlineDisclosureProps = {
  label: string;
  expandedLabel: string;
  children?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  contentHidden?: boolean;
};

export function InlineDisclosure({
  label,
  expandedLabel,
  children,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  contentHidden,
}: InlineDisclosureProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const id = useId();
  const expanded = controlledExpanded ?? uncontrolledExpanded;

  function toggle() {
    const next = !expanded;
    if (controlledExpanded === undefined) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  }

  return (
    <div className="inline-disclosure">
      <div id={id} className="inline-disclosure-content" hidden={contentHidden ?? !expanded}>{children}</div>
      <button type="button" className="inline-disclosure-control" onClick={toggle} aria-expanded={expanded} aria-controls={id}>
        <span aria-hidden="true">{expanded ? "–" : "+"}</span>
        <span>{expanded ? expandedLabel : label}</span>
      </button>
    </div>
  );
}
