"use client";
import Header from "@/components/Header";
import CoreSidebar from "@/components/Sidebar";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";

export default function Main({ children }) {
  const pathname = usePathname();

  // open/close toggle button state
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    if (!showChrome) setSidebarOpen(false);
  }, [showChrome]);

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

  return (
    <PermissionsProvider>
      <div
        className="min-h-screen bg-gray-50"
        style={showChrome ? { ["--sbw"]: `${sbw}px` } : undefined}
      >
        <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />

        {showChrome && (
          <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-gray-200">
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
                onClose={() => setSidebarOpen(false)}
              />
            </aside>

            {/* Mobile backdrop */}
            {!isDesktop && sidebarOpen && (
              <button
                aria-hidden
                className="fixed inset-0 z-[30] bg-black/30"
                onClick={() => setSidebarOpen(false)}
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
    </PermissionsProvider>
  );
}
