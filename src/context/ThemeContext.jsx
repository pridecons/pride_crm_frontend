"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* -------------------------------------------
   Helpers
------------------------------------------- */
function hexToRgba(hex = "#000000", alpha = 1) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(0,0,0,${alpha})`;
  }
}

const toKebab = (s = "") =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

/** Recursively apply CSS variables for nested objects (both camel & kebab) */
function setCssVars(root, prefix, obj) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    const seg = toKebab(k);
    const base = `${prefix}-${seg}`;
    if (v && typeof v === "object") {
      setCssVars(root, base, v);
    } else {
      root.style.setProperty(`--${base}`, String(v));        // kebab version
      root.style.setProperty(`--${prefix}-${k}`, String(v)); // camel version
    }
  });
}

/** Build `components` block from base palette tokens */
function makeComponents(p) {
  return {
    header: {
      bg: p.header,
      text: p.headerText,
      border: p.border,
      shadow: p.shadow
    },
    sidebar: {
      bg: p.sidebar,
      text: p.sidebarText,
      border: p.border,
      activeBg: hexToRgba(p.primary, 0.12),
      activeText: p.primary,
      hoverBg: hexToRgba(p.primary, 0.06)
    },
    card: {
      bg: p.cardBackground,
      text: p.text,
      border: p.border,
      shadow: p.shadow
    },
    modal: {
      bg: p.cardBackground,
      text: p.text,
      border: p.border,
      overlay: "rgba(0,0,0,0.30)",
      headerBg: hexToRgba(p.primary, 0.08),
      headerText: p.text
    },
    input: {
      bg: p.inputBackground,
      text: p.text,
      border: p.inputBorder,
      focus: p.inputFocus,
      placeholder: p.textSecondary
    },
    button: {
      primary: {
        bg: p.primary,
        hoverBg: p.primaryHover,
        text: "#ffffff",
        border: "transparent",
        shadow: hexToRgba(p.primary, 0.25)
      },
      secondary: {
        bg: p.surface,
        hoverBg: hexToRgba(p.primary, 0.06),
        text: p.text,
        border: p.border,
        shadow: p.shadow
      },
      danger: {
        bg: p.error,
        hoverBg: hexToRgba(p.error, 0.85),
        text: "#ffffff",
        border: "transparent",
        shadow: hexToRgba(p.error, 0.25)
      }
    },
    tag: {
      neutral: { bg: p.surface, text: p.text, border: p.border },
      info:    { bg: hexToRgba(p.primary, 0.10), text: p.primary, border: hexToRgba(p.primary, 0.35) },
      accent:  { bg: hexToRgba(p.accent, 0.10),  text: p.accent,  border: hexToRgba(p.accent, 0.35) },
      success: { bg: hexToRgba(p.success, 0.10), text: p.success, border: hexToRgba(p.success, 0.35) },
      warning: { bg: hexToRgba(p.warning, 0.10), text: p.warning, border: hexToRgba(p.warning, 0.35) },
      error:   { bg: hexToRgba(p.error, 0.10),   text: p.error,   border: hexToRgba(p.error, 0.35) }
    },
    table: {
      headerBg: p.surface,
      headerText: p.text,
      rowBg: p.cardBackground,
      rowAltBg: hexToRgba(p.border, 0.12),
      rowHoverBg: hexToRgba(p.primary, 0.06),
      border: p.border
    },
    tooltip: {
      bg: p.text,
      text: p.background,
      border: "transparent",
      shadow: hexToRgba(p.shadow, 0.25)
    }
  };
}

/** Merge `preset` with `components` built from its palette */
function makeTheme(preset) {
  return {
    ...preset,
    components: makeComponents(preset)
  };
}

/** Create a theme by overriding a base palette */
function makePreset(base, overrides = {}) {
  return makeTheme({ ...base, ...overrides });
}

/* -------------------------------------------
   Theme Presets
------------------------------------------- */
const BASES = {
  light: {
    name: "Light",
    icon: "☀️",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondary: "#64748b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    accent: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    sidebar: "#ffffff",
    sidebarText: "#374151",
    header: "#ffffff",
    headerText: "#1f2937",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#d1d5db",
    inputFocus: "#3b82f6",
    shadow: "rgba(0, 0, 0, 0.1)"
  },
  dark: {
    name: "Dark",
    icon: "🌙",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondary: "#94a3b8",
    background: "#0f172a",
    surface: "#111827",
    text: "#e5e7eb",
    textSecondary: "#9ca3af",
    border: "#253142",
    accent: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    sidebar: "#0b1220",
    sidebarText: "#e5e7eb",
    header: "#0b1220",
    headerText: "#e5e7eb",
    cardBackground: "#111827",
    inputBackground: "#1f2937",
    inputBorder: "#374151",
    inputFocus: "#3b82f6",
    shadow: "rgba(0, 0, 0, 0.25)"
  }
};

const THEMES = {
  /* originals */
  light: makeTheme(BASES.light),
  dark: makeTheme(BASES.dark),

  pink: makeTheme({
    ...BASES.light,
    name: "Pink",
    icon: "🌸",
    primary: "#ec4899",
    primaryHover: "#db2777",
    secondary: "#a855f7",
    background: "#fdf2f8",
    surface: "#fce7f3",
    text: "#831843",
    textSecondary: "#be185d",
    border: "#f9a8d4",
    accent: "#a855f7",
    sidebar: "#fce7f3",
    sidebarText: "#831843",
    header: "#fce7f3",
    headerText: "#831843",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#f9a8d4",
    inputFocus: "#ec4899",
    shadow: "rgba(236, 72, 153, 0.1)"
  }),

  purple: makeTheme({
    ...BASES.light,
    name: "Purple",
    icon: "💜",
    primary: "#8b5cf6",
    primaryHover: "#7c3aed",
    secondary: "#06b6d4",
    background: "#faf5ff",
    surface: "#f3e8ff",
    text: "#4c1d95",
    textSecondary: "#7c3aed",
    border: "#c4b5fd",
    accent: "#06b6d4",
    sidebar: "#f3e8ff",
    sidebarText: "#4c1d95",
    header: "#f3e8ff",
    headerText: "#4c1d95",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#c4b5fd",
    inputFocus: "#8b5cf6",
    shadow: "rgba(139, 92, 246, 0.1)"
  }),

  orange: makeTheme({
    ...BASES.light,
    name: "Orange",
    icon: "🧡",
    primary: "#ea580c",
    primaryHover: "#c2410c",
    secondary: "#0891b2",
    background: "#fff7ed",
    surface: "#ffedd5",
    text: "#7c2d12",
    textSecondary: "#9a3412",
    border: "#fdba74",
    accent: "#0891b2",
    sidebar: "#ffedd5",
    sidebarText: "#7c2d12",
    header: "#ffedd5",
    headerText: "#7c2d12",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#fdba74",
    inputFocus: "#ea580c",
    shadow: "rgba(234, 88, 12, 0.1)"
  }),

  /* NEW hybrid & extra palettes (header/sidebar ≠ center) */

  hybridLight: makePreset(BASES.light, {
    name: "Hybrid Light",
    icon: "🧊",
    header: "#0b1220",
    headerText: "#e5e7eb",
    sidebar: "#0b1220",
    sidebarText: "#e5e7eb",
    border: "#e5e7eb",
    shadow: "rgba(11, 18, 32, 0.2)"
  }),

  ocean: makeTheme({
    ...BASES.light,
    name: "Ocean",
    icon: "🌊",
    primary: "#0ea5e9",
    primaryHover: "#0284c7",
    secondary: "#14b8a6",
    background: "#f0f9ff",
    surface: "#e0f2fe",
    text: "#0c4a6e",
    textSecondary: "#0369a1",
    border: "#bae6fd",
    accent: "#14b8a6",
    header: "#0c4a6e",
    headerText: "#e0f2fe",
    sidebar: "#042f44",
    sidebarText: "#e0f2fe",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#93c5fd",
    inputFocus: "#0ea5e9",
    shadow: "rgba(2, 132, 199, 0.15)"
  }),

  slate: makeTheme({
    ...BASES.light,
    name: "Slate",
    icon: "🪨",
    primary: "#475569",
    primaryHover: "#334155",
    secondary: "#0ea5e9",
    background: "#f8fafc",
    surface: "#eef2f6",
    text: "#0f172a",
    textSecondary: "#475569",
    border: "#d8dee9",
    accent: "#0ea5e9",
    header: "#0f172a",
    headerText: "#e2e8f0",
    sidebar: "#111827",
    sidebarText: "#e5e7eb",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#cbd5e1",
    inputFocus: "#475569",
    shadow: "rgba(15, 23, 42, 0.12)"
  }),

  gold: makeTheme({
    ...BASES.light,
    name: "Gold",
    icon: "🏅",
    primary: "#d97706",
    primaryHover: "#b45309",
    secondary: "#2563eb",
    background: "#fffbeb",
    surface: "#fef3c7",
    text: "#78350f",
    textSecondary: "#92400e",
    border: "#fde68a",
    accent: "#2563eb",
    header: "#111827",
    headerText: "#fde68a",
    sidebar: "#1f2937",
    sidebarText: "#fde68a",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#fcd34d",
    inputFocus: "#d97706",
    shadow: "rgba(217, 119, 6, 0.12)"
  }),

  midnight: makeTheme({
    ...BASES.dark,
    name: "Midnight",
    icon: "🌌",
    primary: "#60a5fa",
    primaryHover: "#3b82f6",
    secondary: "#f472b6",
    background: "#0a0f1c",
    surface: "#0f172a",
    text: "#e2e8f0",
    textSecondary: "#94a3b8",
    border: "#1f2a44",
    accent: "#f472b6",
    header: "#090f1a",
    headerText: "#e2e8f0",
    sidebar: "#0b1324",
    sidebarText: "#e2e8f0",
    cardBackground: "#0f172a",
    inputBackground: "#111b2b",
    inputBorder: "#1f2a44",
    inputFocus: "#60a5fa",
    shadow: "rgba(0,0,0,0.35)"
  })
};

/* -------------------------------------------
   Context
------------------------------------------- */
const ThemeContext = createContext({
  theme: "light",
  themeConfig: THEMES.light,
  themes: THEMES,
  setTheme: () => {},
  toggleTheme: () => {}
});

/* Decide readable contrast for primary */
const getPrimaryContrast = (themeKey) =>
  themeKey === "dark" ? "#0b1220" : "#ffffff";

/* Write palette tokens in both styles + aliases your UI expects */
function applyPaletteVars(root, config, themeKey) {
  Object.entries(config).forEach(([key, value]) => {
    if (key === "name" || key === "icon" || key === "components") return;

    root.style.setProperty(`--theme-${key}`, String(value));         // camel
    root.style.setProperty(`--theme-${toKebab(key)}`, String(value)); // kebab
  });

  const aliases = {
    "card-bg": config.cardBackground,
    card: config.cardBackground,
    panel: config.surface,
    surface: config.surface,
    border: config.border,
    text: config.text,
    "text-muted": config.textSecondary,
    muted: config.textSecondary,
    "muted-ink": config.textSecondary,
    background: config.background,
    primary: config.primary,
    "primary-hover": config.primaryHover,
    accent: config.accent,
    success: config.success,
    warn: config.warning,
    warning: config.warning,
    danger: config.error,
    error: config.error,
    "primary-contrast": getPrimaryContrast(themeKey),
    backdrop: themeKey === "dark" ? "rgba(0,0,0,.55)" : "rgba(11,18,32,.45)",
    "primary-soft": hexToRgba(config.primary, themeKey === "dark" ? 0.16 : 0.07),
    "primary-softer": hexToRgba(config.primary, themeKey === "dark" ? 0.10 : 0.05),
    "success-soft": hexToRgba(config.success, themeKey === "dark" ? 0.14 : 0.10),
    "danger-soft": hexToRgba(config.error, themeKey === "dark" ? 0.14 : 0.10)
  };

  Object.entries(aliases).forEach(([k, v]) => {
    root.style.setProperty(`--theme-${k}`, String(v));
  });
}

/* -------------------------------------------
   Provider + Hook
------------------------------------------- */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm-theme") || "light";
    }
    return "light";
  });

  const themeConfig = useMemo(() => THEMES[theme] || THEMES.light, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const config = THEMES[theme] || THEMES.light;

    // 1) palette tokens
    applyPaletteVars(root, config, theme);

    // 2) component tokens (prefix "theme-components")
    setCssVars(root, "theme-components", config.components);

    // 3) data attribute & classes
    root.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");

    // body marker (optional)
    const cls = document.body.className.replace(/theme-\w+/g, "").trim();
    document.body.className = (cls + ` theme-${theme}`).trim();

    // persist
    if (typeof window !== "undefined") {
      localStorage.setItem("crm-theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const keys = Object.keys(THEMES);
    const idx = keys.indexOf(theme);
    const next = (idx + 1) % keys.length;
    setTheme(keys[next]);
  };

  const value = { theme, themeConfig, themes: THEMES, setTheme, toggleTheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
