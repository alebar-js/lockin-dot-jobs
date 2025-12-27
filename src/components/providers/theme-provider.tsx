"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

function getEffectiveTheme(theme: "light" | "dark" | "system"): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(theme);
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme("system");
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}

