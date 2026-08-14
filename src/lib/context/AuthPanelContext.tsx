"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthPanelContextType {
  isAuthPanelOpen: boolean;
  openAuthPanel: () => void;
  closeAuthPanel: () => void;
}

const AuthPanelContext = createContext<AuthPanelContextType | undefined>(undefined);

export function AuthPanelProvider({ children }: { children: ReactNode }) {
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);

  const openAuthPanel = useCallback(() => setIsAuthPanelOpen(true), []);
  const closeAuthPanel = useCallback(() => setIsAuthPanelOpen(false), []);

  const value = useMemo(
    () => ({ isAuthPanelOpen, openAuthPanel, closeAuthPanel }),
    [isAuthPanelOpen, openAuthPanel, closeAuthPanel],
  );

  return <AuthPanelContext.Provider value={value}>{children}</AuthPanelContext.Provider>;
}

export function useAuthPanel() {
  const context = useContext(AuthPanelContext);
  if (context === undefined) {
    throw new Error("useAuthPanel must be used within an AuthPanelProvider");
  }
  return context;
}
