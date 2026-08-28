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

const DRAFT_VERSION = 1;

function draftKey(formType: string, entityId?: string) {
  return `mapa-dobra:draft:${formType}${entityId ? `:${encodeURIComponent(entityId)}` : ""}`;
}

function getStorage(kind: DraftStorage) {
  if (typeof window === "undefined") return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readFormDraft<T>(formType: string, storage: DraftStorage, entityId?: string): FormDraft<T> | null {
  const store = getStorage(storage);
  if (!store) return null;
  const key = draftKey(formType, entityId);
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormDraft<T>;
    const expiresAt = typeof parsed.expiresAt === "string" ? new Date(parsed.expiresAt).getTime() : Number.NaN;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== DRAFT_VERSION ||
      parsed.formType !== formType ||
      parsed.entityId !== entityId ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      store.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try {
      store.removeItem(key);
    } catch {
      // Storage may be disabled by the browser.
    }
    return null;
  }
}

export function writeFormDraft<T>(options: { formType: string; storage: DraftStorage; ttlMs: number; data: T; currentStep?: string | number; entityId?: string }) {
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
  try {
    getStorage(storage)?.removeItem(draftKey(formType, entityId));
  } catch {
    // Storage may be disabled by the browser.
  }
}
