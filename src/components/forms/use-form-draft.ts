"use client";

import { useEffect, useRef, useState } from "react";
import { clearFormDraft, readFormDraft, writeFormDraft, type DraftStorage, type FormDraft } from "@/lib/form-drafts";

export function useFormDraft<T>(config: { formType: string; storage: DraftStorage; ttlMs: number; data: T; currentStep?: string | number; entityId?: string; enabled?: boolean }) {
  const { formType, storage, ttlMs, data, currentStep, entityId, enabled = true } = config;
  const [ready, setReady] = useState(false);
  const [storedDraft, setStoredDraft] = useState<FormDraft<T> | null>(null);
  const [lastSaved, setLastSaved] = useState(false);
  const availableDraft = useRef<FormDraft<T> | null>(null);
  const [initialSerialized] = useState(() => JSON.stringify(data));
  const lastSerialized = useRef(initialSerialized);
  const key = `${formType}:${entityId ?? ""}:${storage}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      availableDraft.current = readFormDraft<T>(formType, storage, entityId);
      setStoredDraft(availableDraft.current);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, entityId, formType, storage]);

  useEffect(() => {
    if (!ready || !enabled || storedDraft) return;
    const serialized = JSON.stringify(data);
    if (serialized === initialSerialized || serialized === lastSerialized.current) return;
    const timer = window.setTimeout(() => {
      if (writeFormDraft({ formType, storage, ttlMs, data, currentStep, entityId })) {
        lastSerialized.current = serialized;
        setLastSaved(true);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [currentStep, data, enabled, entityId, formType, initialSerialized, ready, storage, storedDraft, ttlMs]);

  const clear = () => {
    clearFormDraft(formType, storage, entityId);
    availableDraft.current = null;
    setStoredDraft(null);
  };

  const resume = () => {
    const draft = availableDraft.current ?? readFormDraft<T>(formType, storage, entityId);
    if (draft) {
      lastSerialized.current = JSON.stringify(draft.data);
      setStoredDraft(null);
      setLastSaved(true);
    }
    return draft;
  };

  return {
    storedDraft,
    available: Boolean(storedDraft),
    resume,
    discard: clear,
    clear,
    isDirty: ready && JSON.stringify(data) !== initialSerialized,
    lastSaved: ready && lastSaved,
  };
}
