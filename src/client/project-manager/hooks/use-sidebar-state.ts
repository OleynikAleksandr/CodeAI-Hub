import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pm-sidebar-collapsed";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

/**
 * Hook for managing sidebar collapsed/expanded state.
 * State is persisted to localStorage.
 */
export function useSidebarState(): SidebarState {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage not available
    }
  }, [collapsed]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return { collapsed, toggle };
}
