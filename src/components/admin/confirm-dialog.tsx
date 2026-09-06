"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  formAction: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
  onConfirm?: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({ open, title, description, confirmLabel, pending = false, error, formAction, onCancel, onConfirm, children }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [onCancel, open]);

  if (!open) return null;

  const handleSubmit = () => {
    onConfirm?.();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10231e]/30 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="w-[calc(100vw-2rem)] max-w-[32rem] rounded-xl border border-border bg-white p-6 text-foreground sm:p-7">
        <h2 id="confirm-dialog-title" className="text-xl font-extrabold">{title}</h2>
        <p id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
        {error ? <p role="alert" className="mt-4 rounded-lg bg-urgent-soft p-3 text-sm font-semibold text-[#8c2d0c]">{error}</p> : null}
        <form action={formAction} onSubmit={handleSubmit} className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="min-h-11 rounded-lg px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-surface-muted">Anuluj</button>
          <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60">{pending ? "Zapisywanie..." : confirmLabel}</button>
        </form>
      </div>
    </div>
  );
}
