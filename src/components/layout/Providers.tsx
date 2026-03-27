"use client";

import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Wraps children and syncs the dark/light class on the <html> element
 * based on the current theme from the ThemeProvider (zustand-backed context).
 */
export default function Providers({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
