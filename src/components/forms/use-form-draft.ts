"use client";

import { useEffect, useRef, useState } from "react";
import { clearFormDraft, readFormDraft, writeFormDraft, type DraftStorage, type FormDraft } from "@/lib/form-drafts";

type FormDraftConfig<T> = {
  formType: string;
  storage: DraftStorage;
  ttlMs: number;
  data: T;
  currentStep?: string | number;
  entityId?: string;
  enabled?: boolean;
};

export function useFormDraft<T>(config: FormDraftConfig<T>) {
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);
  const [initialSerialized] = useState(() => JSON.stringify(config.data));
  const [lastSerialized, setLastSerialized] = useState(initialSerialized);
  const [storedDraft, setStoredDraft] = useState<FormDraft<T> | null>(null);
  const availableDraft = useRef<FormDraft<T> | null>(null);
  const key = `${config.formType}:${config.entityId ?? ""}:${config.storage}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      availableDraft.current = readFormDraft<T>(config.formType, config.storage, config.entityId);
      setStoredDraft(availableDraft.current);
      setAvailable(Boolean(availableDraft.current));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key, config.entityId, config.formType, config.storage]);

  useEffect(() => {
    if (!ready || !config.enabled) return;
    const serialized = JSON.stringify(config.data);
    if (serialized === initialSerialized || serialized === lastSerialized) return;
    const timer = window.setTimeout(() => {
      const saved = writeFormDraft({
        formType: config.formType,
        storage: config.storage,
        ttlMs: config.ttlMs,
        data: config.data,
        currentStep: config.currentStep,
        entityId: config.entityId,
      });
      setLastSerialized(serialized);
      setLastSaved(saved);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [config.data, config.enabled, config.entityId, config.formType, config.storage, config.ttlMs, config.currentStep, initialSerialized, lastSerialized, ready]);

  const resume = () => {
    const draft = availableDraft.current ?? readFormDraft<T>(config.formType, config.storage, config.entityId);
    setAvailable(false);
    setStoredDraft(null);
    return draft;
  };

  const discard = () => {
    clearFormDraft(config.formType, config.storage, config.entityId);
    availableDraft.current = null;
    setAvailable(false);
    setStoredDraft(null);
    setLastSaved(false);
  };

  const clear = () => {
    clearFormDraft(config.formType, config.storage, config.entityId);
    availableDraft.current = null;
    setAvailable(false);
    setStoredDraft(null);
    setLastSaved(false);
  };

  return { available, storedDraft, resume, discard, clear, isDirty: ready && JSON.stringify(config.data) !== initialSerialized, lastSaved };
}
