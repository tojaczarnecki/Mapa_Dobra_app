"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useUnsavedChangesGuard } from "@/components/forms/use-unsaved-changes-guard";

type Registry = {
  setDirty: (key: symbol, dirty: boolean) => void;
};

const UnsavedChangesContext = createContext<Registry | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyKeys = useRef(new Set<symbol>());
  const [dirtyCount, setDirtyCount] = useState(0);
  const registry = useMemo<Registry>(() => ({
    setDirty(key, dirty) {
      if (dirty) dirtyKeys.current.add(key);
      else dirtyKeys.current.delete(key);
      setDirtyCount(dirtyKeys.current.size);
    },
  }), []);

  useUnsavedChangesGuard(dirtyCount > 0);

  return <UnsavedChangesContext.Provider value={registry}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChanges(dirty: boolean) {
  const registry = useContext(UnsavedChangesContext);
  const key = useRef(Symbol("unsaved-form"));
  useEffect(() => {
    const token = key.current;
    registry?.setDirty(token, dirty);
    return () => registry?.setDirty(token, false);
  }, [dirty, registry]);
}
