// "use client";

// import { createContext, useContext, useEffect, useState } from "react";

// /* -------------------------------------------
//    Helpers
// ------------------------------------------- */
// function hexToRgba(hex = "#000000", alpha = 1) {
//   try {
//     const h = hex.replace("#", "");
//     const r = parseInt(h.substring(0, 2), 16);
//     const g = parseInt(h.substring(2, 4), 16);
//     const b = parseInt(h.substring(4, 6), 16);
//     return `rgba(${r}, ${g}, ${b}, ${alpha})`;
//   } catch {
//     return `rgba(0,0,0,${alpha})`;
//   }
// }

// /** Recursively apply CSS variables for nested objects:
//  * setCssVars(root, 'theme', { header: { bg:'#fff' }})
//  * => --theme-header-bg: #fff
//  */
// function setCssVars(root, prefix, obj) {
//   Object.entries(obj || {}).forEach(([k, v]) => {
//     const key = `${prefix}-${k}`;
//     if (v && typeof v === "object") {
//       setCssVars(root, key, v);
//     } else {
//       root.style.setProperty(`--${key}`, String(v));
//     }
//   });
// }

// /** Build `components` block from base palette tokens */
// function makeComponents(p) {
//   return {
//     header: {
//       bg: p.header,
//       text: p.headerText,
//       border: p.border,
//       shadow: p.shadow
//     },
//     sidebar: {
//       bg: p.sidebar,
//       text: p.sidebarText,
//       border: p.border,
//       activeBg: hexToRgba(p.primary, 0.12),
//       activeText: p.primary,
//       hoverBg: hexToRgba(p.primary, 0.06)
//     },
//     card: {
//       bg: p.cardBackground,
//       text: p.text,
//       border: p.border,
//       shadow: p.shadow
//     },
//     modal: {
//       bg: p.cardBackground,
//       text: p.text,
//       border: p.border,
//       overlay: "rgba(0,0,0,0.30)",
//       headerBg: hexToRgba(p.primary, 0.08),
//       headerText: p.text
//     },
//     input: {
//       bg: p.inputBackground,
//       text: p.text,
//       border: p.inputBorder,
//       focus: p.inputFocus,
//       placeholder: p.textSecondary
//     },
//     button: {
//       primary: {
//         bg: p.primary,
//         hoverBg: p.primaryHover,
//         text: "#ffffff",
//         border: "transparent",
//         shadow: hexToRgba(p.primary, 0.25)
//       },
//       secondary: {
//         bg: p.surface,
//         hoverBg: hexToRgba(p.primary, 0.06),
//         text: p.text,
//         border: p.border,
//         shadow: hexToRgba(p.shadow, 0.1)
//       },
//       danger: {
//         bg: p.error,
//         hoverBg: hexToRgba(p.error, 0.85),
//         text: "#ffffff",
//         border: "transparent",
//         shadow: hexToRgba(p.error, 0.25)
//       }
//     },
//     tag: {
//       neutral: {
//         bg: p.surface,
//         text: p.text,
//         border: p.border
//       },
//       info: {
//         bg: hexToRgba(p.primary, 0.10),
//         text: p.primary,
//         border: hexToRgba(p.primary, 0.35)
//       },
//       accent: {
//         bg: hexToRgba(p.accent, 0.10),
//         text: p.accent,
//         border: hexToRgba(p.accent, 0.35)
//       },
//       success: {
//         bg: hexToRgba(p.success, 0.10),
//         text: p.success,
//         border: hexToRgba(p.success, 0.35)
//       },
//       warning: {
//         bg: hexToRgba(p.warning, 0.10),
//         text: p.warning,
//         border: hexToRgba(p.warning, 0.35)
//       },
//       error: {
//         bg: hexToRgba(p.error, 0.10),
//         text: p.error,
//         border: hexToRgba(p.error, 0.35)
//       }
//     },
//     table: {
//       headerBg: p.surface,
//       headerText: p.text,
//       rowBg: p.cardBackground,
//       rowAltBg: hexToRgba(p.border, 0.12),
//       rowHoverBg: hexToRgba(p.primary, 0.06),
//       border: p.border
//     },
//     tooltip: {
//       bg: p.text,
//       text: p.background,
//       border: "transparent",
//       shadow: hexToRgba(p.shadow, 0.25)
//     }
//   };
// }

// /** Merge `preset` with `components` built from its palette */
// function makeTheme(preset) {
//   return {
//     ...preset,
//     components: makeComponents(preset)
//   };
// }

// /* -------------------------------------------
//    Theme Presets (old top-level tokens intact)
// ------------------------------------------- */

// const THEMES = {
//   light: makeTheme({
//     name: "Light",
//     icon: "☀️",
//     primary: "#3b82f6",
//     primaryHover: "#2563eb",
//     secondary: "#64748b",
//     background: "#ffffff",
//     surface: "#f8fafc",
//     text: "#1e293b",
//     textSecondary: "#64748b",
//     border: "#e2e8f0",
//     accent: "#10b981",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#ffffff",
//     sidebarText: "#374151",
//     header: "#ffffff",
//     headerText: "#1f2937",
//     cardBackground: "#ffffff",
//     inputBackground: "#ffffff",
//     inputBorder: "#d1d5db",
//     inputFocus: "#3b82f6",
//     shadow: "rgba(0, 0, 0, 0.1)"
//   }),
//   dark: makeTheme({
//     name: "Dark",
//     icon: "🌙",
//     primary: "#3b82f6",
//     primaryHover: "#2563eb",
//     secondary: "#64748b",
//     background: "#0f172a",
//     surface: "#1e293b",
//     text: "#f1f5f9",
//     textSecondary: "#94a3b8",
//     border: "#334155",
//     accent: "#10b981",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#1e293b",
//     sidebarText: "#f1f5f9",
//     header: "#1e293b",
//     headerText: "#f1f5f9",
//     cardBackground: "#1e293b",
//     inputBackground: "#334155",
//     inputBorder: "#475569",
//     inputFocus: "#3b82f6",
//     shadow: "rgba(0, 0, 0, 0.25)"
//   }),
//   pink: makeTheme({
//     name: "Pink",
//     icon: "🌸",
//     primary: "#ec4899",
//     primaryHover: "#db2777",
//     secondary: "#a855f7",
//     background: "#fdf2f8",
//     surface: "#fce7f3",
//     text: "#831843",
//     textSecondary: "#be185d",
//     border: "#f9a8d4",
//     accent: "#a855f7",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#fce7f3",
//     sidebarText: "#831843",
//     header: "#fce7f3",
//     headerText: "#831843",
//     cardBackground: "#ffffff",
//     inputBackground: "#ffffff",
//     inputBorder: "#f9a8d4",
//     inputFocus: "#ec4899",
//     shadow: "rgba(236, 72, 153, 0.1)"
//   }),
//   purple: makeTheme({
//     name: "Purple",
//     icon: "💜",
//     primary: "#8b5cf6",
//     primaryHover: "#7c3aed",
//     secondary: "#06b6d4",
//     background: "#faf5ff",
//     surface: "#f3e8ff",
//     text: "#4c1d95",
//     textSecondary: "#7c3aed",
//     border: "#c4b5fd",
//     accent: "#06b6d4",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#f3e8ff",
//     sidebarText: "#4c1d95",
//     header: "#f3e8ff",
//     headerText: "#4c1d95",
//     cardBackground: "#ffffff",
//     inputBackground: "#ffffff",
//     inputBorder: "#c4b5fd",
//     inputFocus: "#8b5cf6",
//     shadow: "rgba(139, 92, 246, 0.1)"
//   }),
//   green: makeTheme({
//     name: "Green",
//     icon: "🌿",
//     primary: "#059669",
//     primaryHover: "#047857",
//     secondary: "#0891b2",
//     background: "#f0fdf4",
//     surface: "#dcfce7",
//     text: "#14532d",
//     textSecondary: "#166534",
//     border: "#86efac",
//     accent: "#0891b2",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#dcfce7",
//     sidebarText: "#14532d",
//     header: "#dcfce7",
//     headerText: "#14532d",
//     cardBackground: "#ffffff",
//     inputBackground: "#ffffff",
//     inputBorder: "#86efac",
//     inputFocus: "#059669",
//     shadow: "rgba(5, 150, 105, 0.1)"
//   }),
//   orange: makeTheme({
//     name: "Orange",
//     icon: "🧡",
//     primary: "#ea580c",
//     primaryHover: "#c2410c",
//     secondary: "#0891b2",
//     background: "#fff7ed",
//     surface: "#ffedd5",
//     text: "#7c2d12",
//     textSecondary: "#9a3412",
//     border: "#fdba74",
//     accent: "#0891b2",
//     error: "#ef4444",
//     warning: "#f59e0b",
//     success: "#22c55e",
//     sidebar: "#ffedd5",
//     sidebarText: "#7c2d12",
//     header: "#ffedd5",
//     headerText: "#7c2d12",
//     cardBackground: "#ffffff",
//     inputBackground: "#ffffff",
//     inputBorder: "#fdba74",
//     inputFocus: "#ea580c",
//     shadow: "rgba(234, 88, 12, 0.1)"
//   })
// };

// /* -------------------------------------------
//    Context
// ------------------------------------------- */

// const ThemeContext = createContext({
//   theme: "light",
//   themeConfig: THEMES.light,
//   themes: THEMES,
//   setTheme: () => {},
//   toggleTheme: () => {}
// });

// export function ThemeProvider({ children }) {
//   const [theme, setTheme] = useState(() => {
//     if (typeof window !== "undefined") {
//       return localStorage.getItem("crm-theme") || "light";
//     }
//     return "light";
//   });

//   const themeConfig = THEMES[theme] || THEMES.light;

//   // Apply theme to CSS variables (palette + components)
//   useEffect(() => {
//     const root = document.documentElement;
//     const config = THEMES[theme] || THEMES.light;

//     // 1) palette tokens → --theme-<key>
//     Object.entries(config).forEach(([key, value]) => {
//       if (key === "name" || key === "icon" || key === "components") return;
//       root.style.setProperty(`--theme-${key}`, String(value));
//     });

//     // 2) component tokens → --theme-<component>-<prop>
//     setCssVars(root, "theme", { components: config.components });

//     // body theme class
//     document.body.className =
//       document.body.className.replace(/theme-\w+/g, "").trim() + ` theme-${theme}`;

//     // persist
//     if (typeof window !== "undefined") {
//       localStorage.setItem("crm-theme", theme);
//     }
//   }, [theme]);

//   const toggleTheme = () => {
//     const themeKeys = Object.keys(THEMES);
//     const currentIndex = themeKeys.indexOf(theme);
//     const nextIndex = (currentIndex + 1) % themeKeys.length;
//     setTheme(themeKeys[nextIndex]);
//   };

//   const value = {
//     theme,
//     themeConfig,
//     themes: THEMES,
//     setTheme,
//     toggleTheme
//   };

//   return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
// }

// export function useTheme() {
//   const context = useContext(ThemeContext);
//   if (!context) {
//     throw new Error("useTheme must be used within a ThemeProvider");
//   }
//   return context;
// }
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
      root.style.setProperty(`--${base}`, String(v));            // kebab version
      root.style.setProperty(`--${prefix}-${k}`, String(v));     // camel version
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
        // p.shadow is already rgba; keep as-is
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
      neutral: {
        bg: p.surface,
        text: p.text,
        border: p.border
      },
      info: {
        bg: hexToRgba(p.primary, 0.10),
        text: p.primary,
        border: hexToRgba(p.primary, 0.35)
      },
      accent: {
        bg: hexToRgba(p.accent, 0.10),
        text: p.accent,
        border: hexToRgba(p.accent, 0.35)
      },
      success: {
        bg: hexToRgba(p.success, 0.10),
        text: p.success,
        border: hexToRgba(p.success, 0.35)
      },
      warning: {
        bg: hexToRgba(p.warning, 0.10),
        text: p.warning,
        border: hexToRgba(p.warning, 0.35)
      },
      error: {
        bg: hexToRgba(p.error, 0.10),
        text: p.error,
        border: hexToRgba(p.error, 0.35)
      }
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

/* -------------------------------------------
   Theme Presets (unchanged)
------------------------------------------- */
const THEMES = {
  light: makeTheme({
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
  }),
  dark: makeTheme({
    name: "Dark",
    icon: "🌙",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    secondary: "#64748b",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    accent: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    sidebar: "#1e293b",
    sidebarText: "#f1f5f9",
    header: "#1e293b",
    headerText: "#f1f5f9",
    cardBackground: "#1e293b",
    inputBackground: "#334155",
    inputBorder: "#475569",
    inputFocus: "#3b82f6",
    shadow: "rgba(0, 0, 0, 0.25)"
  }),
  pink: makeTheme({
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
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
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
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
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
  green: makeTheme({
    name: "Green",
    icon: "🌿",
    primary: "#059669",
    primaryHover: "#047857",
    secondary: "#0891b2",
    background: "#f0fdf4",
    surface: "#dcfce7",
    text: "#14532d",
    textSecondary: "#166534",
    border: "#86efac",
    accent: "#0891b2",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    sidebar: "#dcfce7",
    sidebarText: "#14532d",
    header: "#dcfce7",
    headerText: "#14532d",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#86efac",
    inputFocus: "#059669",
    shadow: "rgba(5, 150, 105, 0.1)"
  }),
  orange: makeTheme({
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
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    sidebar: "#ffedd5",
    sidebarText: "#7c2d12",
    header: "#ffedd5",
    headerText: "#7c2d12",
    cardBackground: "#ffffff",
    inputBackground: "#ffffff",
    inputBorder: "#fdba74",
    inputFocus: "#ea580c",
    shadow: "rgba(234, 88, 12, 0.1)"
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

    // camel
    root.style.setProperty(`--theme-${key}`, String(value));
    // kebab
    root.style.setProperty(`--theme-${toKebab(key)}`, String(value));
  });

  // Common aliases (kebab) that your components already use
  const aliases = {
    "card-bg": config.cardBackground,
    card: config.cardBackground,
    panel: config.surface,
    surface: config.surface, // duplicate for safety
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
    "backdrop": themeKey === "dark" ? "rgba(0,0,0,.55)" : "rgba(11,18,32,.45)",
    "primary-soft": hexToRgba(config.primary, themeKey === "dark" ? 0.16 : 0.07),
    "primary-softer": hexToRgba(config.primary, themeKey === "dark" ? 0.10 : 0.05),
    "success-soft": hexToRgba(config.success, themeKey === "dark" ? 0.14 : 0.10),
    "danger-soft": hexToRgba(config.error, themeKey === "dark" ? 0.14 : 0.10)
  };

  Object.entries(aliases).forEach(([k, v]) => {
    root.style.setProperty(`--theme-${k}`, String(v));
  });
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm-theme") || "light";
    }
    return "light";
  });

  const themeConfig = useMemo(
    () => THEMES[theme] || THEMES.light,
    [theme]
  );

  // Apply theme to CSS variables (palette + components)
  useEffect(() => {
    const root = document.documentElement;
    const config = THEMES[theme] || THEMES.light;

    // 1) palette tokens → write camel + kebab + aliases
    applyPaletteVars(root, config, theme);

    // 2) component tokens → both camel & kebab (prefix "theme-components")
    setCssVars(root, "theme-components", config.components);

    // 3) data attribute & classes for targeting
    root.setAttribute("data-theme", theme);

    // add .dark for dark theme so Tailwind/your CSS works
    document.documentElement.classList.toggle("dark", theme === "dark");

    // theme-* marker on body (optional)
    const cls = document.body.className.replace(/theme-\w+/g, "").trim();
    document.body.className = (cls + ` theme-${theme}`).trim();

    // persist
    if (typeof window !== "undefined") {
      localStorage.setItem("crm-theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setTheme(themeKeys[nextIndex]);
  };

  const value = {
    theme,
    themeConfig,
    themes: THEMES,
    setTheme,
    toggleTheme
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
