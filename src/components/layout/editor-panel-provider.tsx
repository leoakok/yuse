"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const EDITOR_OPEN_KEY = "cv-shell-editor-open";

interface EditorPanelContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

const EditorPanelContext = createContext<EditorPanelContextValue | null>(null);

export function EditorPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpenState] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(EDITOR_OPEN_KEY);
    if (stored !== null) {
      setOpenState(stored === "true");
    }
  }, []);

  const setOpen = useCallback((open: boolean) => {
    setOpenState(open);
    localStorage.setItem(EDITOR_OPEN_KEY, String(open));
  }, []);

  const toggleOpen = useCallback(() => {
    setOpenState((prev) => {
      const next = !prev;
      localStorage.setItem(EDITOR_OPEN_KEY, String(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      setOpen,
      toggleOpen,
    }),
    [isOpen, setOpen, toggleOpen]
  );

  return <EditorPanelContext.Provider value={value}>{children}</EditorPanelContext.Provider>;
}

export function useEditorPanel() {
  const ctx = useContext(EditorPanelContext);
  if (!ctx) {
    throw new Error("useEditorPanel must be used within EditorPanelProvider");
  }
  return ctx;
}
