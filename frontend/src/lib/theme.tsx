/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */
import React, { createContext, useContext, useEffect, useState } from "react";

export type NexusTheme =
  | "cupertino-frost"
  | "apple-pro-dark"
  | "tesla-midnight"
  | "obsidian-carbon"
  | "blueprint-tactical";

export interface ThemeMetadata {
  id: NexusTheme;
  name: string;
  inspiration: string;
  bestFor: string;
  bgHex: string;
  accentHex: string;
  glassSurface: string;
  previewGradient: string;
}

export const NEXUS_THEMES: Record<NexusTheme, ThemeMetadata> = {
  "cupertino-frost": {
    id: "cupertino-frost",
    name: "Apple Light (Cupertino)",
    inspiration: "macOS Sequoia & Apple VisionOS Light",
    bestFor: "Default Native Apple Light Interface",
    bgHex: "#F5F5F7",
    accentHex: "#0071E3",
    glassSurface: "rgba(255, 255, 255, 0.72)",
    previewGradient: "from-blue-500 to-slate-100",
  },
  "apple-pro-dark": {
    id: "apple-pro-dark",
    name: "Apple Pro Dark",
    inspiration: "macOS Sequoia & Pro Display Glass",
    bestFor: "Pro Display Dark Studio Interface",
    bgHex: "#0C0C0E",
    accentHex: "#007AFF",
    glassSurface: "rgba(28, 28, 30, 0.72)",
    previewGradient: "from-blue-600 to-zinc-900",
  },
  "tesla-midnight": {
    id: "tesla-midnight",
    name: "Tesla Midnight",
    inspiration: "Tesla Cybertruck / Model S HMI",
    bestFor: "24/7 Dark-Room NOC Video Walls",
    bgHex: "#0B0E14",
    accentHex: "#3B82F6",
    glassSurface: "rgba(22, 27, 38, 0.78)",
    previewGradient: "from-blue-600 to-slate-900",
  },
  "obsidian-carbon": {
    id: "obsidian-carbon",
    name: "Obsidian Carbon",
    inspiration: "OLED Pure Black Pro Display",
    bestFor: "High-Contrast Power & Thermal Analysis",
    bgHex: "#000000",
    accentHex: "#10B981",
    glassSurface: "rgba(18, 18, 20, 0.90)",
    previewGradient: "from-emerald-500 to-black",
  },
  "blueprint-tactical": {
    id: "blueprint-tactical",
    name: "Blueprint Tactical",
    inspiration: "Architectural CAD / Engineering Grid",
    bestFor: "Floor Layout Planning & Capacity Design",
    bgHex: "#0F172A",
    accentHex: "#06B6D4",
    glassSurface: "rgba(30, 41, 59, 0.82)",
    previewGradient: "from-cyan-500 to-slate-950",
  },
};

interface ThemeContextValue {
  theme: NexusTheme;
  themeMeta: ThemeMetadata;
  setTheme: (theme: NexusTheme) => void;
  cycleTheme: () => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "nexustwin_theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<NexusTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as NexusTheme | null;
      if (stored && stored in NEXUS_THEMES) {
        return stored;
      }
    }
    return "cupertino-frost";
  });

  const setTheme = (newTheme: NexusTheme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const cycleTheme = () => {
    const themeKeys: NexusTheme[] = [
      "cupertino-frost",
      "apple-pro-dark",
      "tesla-midnight",
      "obsidian-carbon",
      "blueprint-tactical",
    ];
    const currentIndex = themeKeys.indexOf(theme);
    const nextTheme = themeKeys[(currentIndex + 1) % themeKeys.length];
    setTheme(nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    themeMeta: NEXUS_THEMES[theme],
    setTheme,
    cycleTheme,
    isLight: theme === "cupertino-frost",
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
