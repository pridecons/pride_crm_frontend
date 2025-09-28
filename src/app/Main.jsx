"use client";
import Header from "@/components/Header";
import CoreSidebar from "@/components/Sidebar";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

/* small helper for semi-transparent overlays from solid hex */
function hexToRgba(hex = "#000000", alpha = 0.3) {
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

function Chrome({ children }) {
  const pathname = usePathname();
  const { themeConfig } = useTheme();

  // open/close toggle button state (persisted)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpen");
      if (saved === "true" || saved === "false") return saved === "true";
    }
    return true; // default
  });

  // track if viewport is desktop (>= md)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Are we on the login page?
  const showChrome = pathname !== "/login";

  // If we’re on login, force the sidebar closed (no mini icons either)
  useEffect(() => {
    if (!showChrome) {
      setSidebarOpen(false);
    } else {
      const saved =
        typeof window !== "undefined" && localStorage.getItem("sidebarOpen");
      if (saved === "true" || saved === "false") setSidebarOpen(saved === "true");
    }
  }, [showChrome]);

  useEffect(() => {
    if (showChrome) {
      localStorage.setItem("sidebarOpen", String(sidebarOpen));
    }
  }, [sidebarOpen, showChrome]);

  const FULL_W = 256;
  const MINI_W = 64;

  // Compute current sidebar width for header/main padding
  const sbw = useMemo(() => {
    if (!showChrome) return 0; // ⬅️ No sidebar width on login
    if (!isDesktop) return sidebarOpen ? FULL_W : 0; // mobile overlay
    return sidebarOpen ? FULL_W : MINI_W; // desktop mini
  }, [showChrome, sidebarOpen, isDesktop]);

  // On desktop we **never** slide out; on mobile we slide
  const asideTransform = isDesktop
    ? "translateX(0)"
    : sidebarOpen
    ? "translateX(0)"
    : "translateX(-100%)";

  // Theme tokens with safe fallbacks
  const appBg = themeConfig?.background || "#ffffff";
  const appText = themeConfig?.text || "#1f2937";
  const headerBg = themeConfig?.header || appBg;
  const headerText = themeConfig?.headerText || appText;
  const border = themeConfig?.border || "#e5e7eb";
  const shadow = themeConfig?.shadow || "rgba(0,0,0,0.25)";

  return (
    <div
      className="min-h-screen"
      style={{
        ["--sbw"]: showChrome ? `${sbw}px` : undefined,
        backgroundColor: appBg,
        color: appText,
      }}
    >
      <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />

      {showChrome && (
        <header
          className="fixed top-0 left-0 right-0 z-50 h-16"
          style={{
            backgroundColor: headerBg,
            color: headerText,
            borderBottom: `1px solid ${border}`,
            // keep wrapper lightweight: the inner <Header /> is fully themed already
          }}
        >
          <Header
            onMenuClick={() => setSidebarOpen((v) => !v)}
            sidebarOpen={sidebarOpen}
          />
        </header>
      )}

      {showChrome && (
        <>
          {/* Sidebar sits under the header now */}
          <aside
            className="fixed top-16 bottom-0 left-0 z-[40] transition-[transform,width] duration-200 md:w-[var(--sbw)]"
            style={{ transform: asideTransform, width: isDesktop ? sbw : FULL_W }}
          >
            <CoreSidebar
              collapsed={isDesktop && !sidebarOpen}
              widthPx={isDesktop ? sbw : FULL_W}
              onClose={() => {
                if (!isDesktop) setSidebarOpen(false); // only close on mobile overlay
              }}
            />
          </aside>

          {/* Mobile backdrop */}
          {!isDesktop && sidebarOpen && (
            <button
              aria-hidden
              className="fixed inset-0 z-[30]"
              onClick={() => setSidebarOpen(false)}
              style={{
                backgroundColor: hexToRgba(
                  // derive overlay from theme shadow or fallback to black
                  (shadow.startsWith("rgba") || shadow.startsWith("#")) ? shadow : "#000000",
                  0.3
                ),
              }}
            />
          )}
        </>
      )}

      <main
        className="min-h-screen"
        style={{
          paddingTop: showChrome ? "64px" : "0px",
          paddingLeft: showChrome ? "var(--sbw)" : 0, // ⬅️ No left pad on login
          transition: "padding-left 200ms ease",
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default function Main({ children }) {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <Chrome>{children}</Chrome>
      </PermissionsProvider>
    </ThemeProvider>
  );
}
