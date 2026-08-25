export type DraftStorage = "session" | "local";

export type FormDraft<T> = {
  version: number;
  formType: string;
  entityId?: string;
  currentStep?: string | number;
  updatedAt: string;
  expiresAt: string;
  data: T;
};

export const DRAFT_VERSION = 1;

export function draftKey(formType: string, entityId?: string) {
  const suffix = entityId ? `:${encodeURIComponent(entityId)}` : "";
  return `mapa-dobra:draft:${formType}${suffix}`;
}

function getStorage(kind: DraftStorage) {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readFormDraft<T>(formType: string, storage: DraftStorage, entityId?: string) {
  const store = getStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(draftKey(formType, entityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraft<T>;
    if (parsed.version !== DRAFT_VERSION || parsed.formType !== formType || parsed.entityId !== entityId) {
      store.removeItem(draftKey(formType, entityId));
      return null;
    }
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      store.removeItem(draftKey(formType, entityId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(options: {
  formType: string;
  storage: DraftStorage;
  ttlMs: number;
  data: T;
  currentStep?: string | number;
  entityId?: string;
}) {
  const store = getStorage(options.storage);
  if (!store) return false;
  const now = new Date();
  const record: FormDraft<T> = {
    version: DRAFT_VERSION,
    formType: options.formType,
    ...(options.entityId ? { entityId: options.entityId } : {}),
    ...(options.currentStep !== undefined ? { currentStep: options.currentStep } : {}),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + options.ttlMs).toISOString(),
    data: options.data,
  };
  try {
    store.setItem(draftKey(options.formType, options.entityId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearFormDraft(formType: string, storage: DraftStorage, entityId?: string) {
  const store = getStorage(storage);
  try { store?.removeItem(draftKey(formType, entityId)); } catch { /* storage can be disabled */ }
}
