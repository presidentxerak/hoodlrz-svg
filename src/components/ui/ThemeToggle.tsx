"use client";

import { Moon, Sun } from "lucide-react";
<<<<<<< HEAD
import { create } from "zustand";
import { useEffect } from "react";

const STORAGE_KEY = "hoodlrz-theme";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  hydrate: () => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored ?? "dark";
    set({ theme: initial });
    document.documentElement.classList.toggle("dark", initial === "dark");
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  },
}));

export default function ThemeToggle() {
  const { theme, toggleTheme, hydrate } = useThemeStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);
=======
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
>>>>>>> claude/build-hoodlrz-platform-7Ex6i

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="relative flex h-9 w-9 items-center justify-center border border-[var(--border)] bg-surface text-foreground transition-colors duration-150 hover:text-accent-red"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
