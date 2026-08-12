"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";

type Registry = {
  setDirty: (key: symbol, dirty: boolean) => void;
};

const UnsavedChangesContext = createContext<Registry | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyKeys = useRef(new Set<symbol>());
  const registry = useMemo<Registry>(() => ({
    setDirty(key, dirty) {
      if (dirty) dirtyKeys.current.add(key);
      else dirtyKeys.current.delete(key);
    },
  }), []);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyKeys.current.size) return;
      event.preventDefault();
    }
    function guardAdminLink(event: MouseEvent) {
      if (!dirtyKeys.current.size || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank") return;
      const next = new URL(target.href, window.location.href);
      if (next.origin !== window.location.origin || !next.pathname.startsWith("/admin") || next.href === window.location.href) return;
      if (!window.confirm("Masz niezapisane zmiany. Opuścić tę stronę i je utracić?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", guardAdminLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", guardAdminLink, true);
    };
  }, []);

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
