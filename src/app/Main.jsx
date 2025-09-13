"use client";
import Header from "@/components/Header";
import CoreSidebar from "@/components/Sidebar";
import { PermissionsProvider } from "@/context/PermissionsContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export default function Main({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const showChrome = pathname !== "/login";
  const SB_PX = 256;                     // <- sidebar width
  const sbw = sidebarOpen ? SB_PX : 0;

  return (
    <PermissionsProvider>
      <div className="min-h-screen bg-gray-50" style={{ '--sbw': `${sbw}px` }}>
  <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />

  {showChrome && (
    <header
      className="fixed top-0 inset-x-0 z-50 h-16"
      style={{ paddingLeft: 'var(--sbw)', transition: 'padding-left 200ms ease' }}
    >
      <Header onMenuClick={() => setSidebarOpen(v => !v)} sidebarOpen={sidebarOpen} />
    </header>
  )}

  {showChrome && (
    <>
      <aside
        className="fixed top-0 bottom-0 left-0 z-[40] w-64 transition-transform duration-200"
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <CoreSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </aside>
      <button
        aria-hidden
        className={sidebarOpen ? 'fixed inset-0 z-[30] block' : 'hidden'}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  )}

  <main
    className="min-h-screen"
    style={{ paddingTop: showChrome ? '64px' : '0px', paddingLeft: 'var(--sbw)', transition: 'padding-left 200ms ease' }}
  >
    {children}
  </main>
</div>
    </PermissionsProvider>
  );
}
