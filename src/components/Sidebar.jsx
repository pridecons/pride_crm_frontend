"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  Home, Target, History, UserPlus, Users, Building2, Building, Settings,
  FileText, Wrench, Tag, Gauge, UploadCloud, BarChart3, UserCheck, ShieldCheck,
  ClipboardList, CreditCard, Mail, MessageCircle, MessageSquare, CalendarCheck,
  ChevronDown, ChevronRight, LogOut, User, SlidersHorizontal, PhoneCall,
  PlusCircle, MessagesSquare, ClipboardCheck, FileSearch, StickyNote,
  PieChart, UserCog, MailOpen, MessageSquareText,
  Share
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { createPortal } from "react-dom";
import { useTheme } from "@/context/ThemeContext";

/* ----------------------------------- */
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

function isPathActive(pathname, href, match = "exact") {
  if (!pathname || !href) return false;
  const p = pathname.replace(/\/+$/, "");
  const h = href.replace(/\/+$/, "");
  if (match === "prefix") return p === h || (h !== "/" && p.startsWith(h + "/"));
  return p === h;
}

/* ----------------------------------- */
function MobileUser({ sidebarVars }) {
  const [user, setUser] = useState(null);
  const [isConnect] = useState(false);

  useEffect(() => {
    const accessToken = Cookies.get("access_token");
    const userInfo = Cookies.get("user_info");
    if (accessToken && userInfo) {
      const d = jwtDecode(accessToken);
      setUser({ ...JSON.parse(userInfo), role: d.role || d.role_name });
    }
  }, []);

  return (
    <div
      className="md:hidden flex items-center gap-3 px-3 py-3"
      style={{ borderBottom: `1px solid ${sidebarVars.border}` }}
    >
      <div className="relative">
        <div
          className="w-9 h-9 rounded-full grid place-items-center"
          style={{ backgroundColor: hexToRgba(sidebarVars.iconBg, 1) }}
        >
          <User size={16} style={{ color: sidebarVars.icon }} />
        </div>
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: isConnect ? sidebarVars.success : sidebarVars.error,
            boxShadow: `0 0 0 2px ${sidebarVars.bg}`
          }}
        />
      </div>
      <div className="min-w-0">
        <p
          className="text-[13px] font-medium truncate"
          style={{ color: sidebarVars.text }}
        >
          {user?.name || "User"}
        </p>
        <p
          className="text-[11px] truncate"
          style={{ color: sidebarVars.muted }}
        >
          {user?.role || "Role"}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------- */
export default function CoreSidebar({ collapsed = false, widthPx = 256, onClose }) {
  const { hasPermission } = usePermissions();
  const pathname = usePathname();
  const { themeConfig } = useTheme();

  // Sidebar color tokens (prefer components.sidebar; fallback to globals)
  const sidebarVars = (themeConfig && themeConfig.components && themeConfig.components.sidebar)
    ? themeConfig.components.sidebar
    : {
        bg: themeConfig.sidebar || themeConfig.surface || "#1e293b",
        text: themeConfig.sidebarText || themeConfig.text || "#f1f5f9",
        muted: themeConfig.textSecondary || "#94a3b8",
        border: themeConfig.border || "#334155",
        hoverBg: hexToRgba(themeConfig.primary || "#3b82f6", 0.10),
        activeBg: hexToRgba(themeConfig.primary || "#3b82f6", 0.22),
        activeText: "#ffffff",
        icon: themeConfig.textSecondary || "#94a3b8",
        iconActive: "#ffffff",
        iconBg: hexToRgba(themeConfig.text || "#f1f5f9", 0.1),
        tooltipBg: hexToRgba("#000000", 0.85),
        tooltipText: "#ffffff",
        shadow: themeConfig.shadow || "rgba(0,0,0,0.25)",
        success: themeConfig.success || "#22c55e",
        error: themeConfig.error || "#ef4444",
        sectionTitle: themeConfig.textSecondary || "#94a3b8",
      };

  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState({
    leads: true,
    management: false,
    configuration: true,
    template: false,
    reports: false,
  });

  useEffect(() => {
    const accessToken = Cookies.get("access_token");
    const userInfo = Cookies.get("user_info");
    if (accessToken && userInfo) {
      const d = jwtDecode(accessToken);
      setUser({ ...JSON.parse(userInfo), role: d.role_name || d.role });
    }
  }, []);

  const toggle = (key) => setExpanded((s) => ({ ...s, [key]: !s[key] }));

  function HoverTip({ show, x, y, label }) {
    if (!show) return null;
    return createPortal(
      <div
        className="fixed z-[9999] pointer-events-none -translate-y-1/2"
        style={{ left: x, top: y }}
      >
        <div
          className="rounded px-2 py-1 text-xs whitespace-nowrap"
          style={{
            background: sidebarVars.tooltipBg,
            color: sidebarVars.tooltipText,
            boxShadow: `0 8px 16px ${sidebarVars.shadow}`
          }}
        >
          {label}
        </div>
      </div>,
      document.body
    );
  }

  const NavItem = ({ href, icon: Icon, label, activeMatch = "exact" }) => {
    const active = isPathActive(pathname, href, activeMatch);
    const [hover, setHover] = useState(false);
    const [tip, setTip] = useState({ show: false, x: 0, y: 0 });
    const [iconRef, setIconRef] = useState(null);

    const bg = active
      ? sidebarVars.activeBg
      : (hover ? sidebarVars.hoverBg : "transparent");
    const fg = active
      ? sidebarVars.activeText
      : (hover ? sidebarVars.text : sidebarVars.text);

    const iconColor = active ? sidebarVars.iconActive : sidebarVars.icon;

    const handleEnter = (e) => {
      setHover(true);
      if (!collapsed || !iconRef) return;
      const r = iconRef.getBoundingClientRect();
      setTip({ show: true, x: r.right + 10, y: r.top + r.height / 2 });
    };
    const handleLeave = () => { setHover(false); setTip((t) => ({ ...t, show: false })); };

    return (
      <li>
        <Link
          href={href}
          onClick={onClose}
          aria-label={label}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className={["flex items-center", collapsed ? "justify-center h-10 w-10" : "gap-2.5 px-3 py-2", "rounded-md text-[13px] transition leading-none"].join(" ")}
          style={{ backgroundColor: bg, color: fg }}
        >
          <span
            ref={setIconRef}
            className={collapsed ? "h-10 w-10 grid place-items-center" : "grid place-items-center"}
          >
            <Icon size={18} style={{ color: iconColor }} />
          </span>
          {!collapsed && <span className="truncate" style={{ color: fg }}>{label}</span>}
        </Link>

        {collapsed && <HoverTip show={tip.show} x={tip.x} y={tip.y} label={label} />}
      </li>
    );
  };

  /* ------------ MENU ------------- */
  const rawMenu = useMemo(
    () => [
      { items: [{ href: "/dashboard", icon: Home, label: "Home", access: "" }] },
      {
        title: "LEADS", section: "leads", icon: Target,
        items: [
          { href: "/lead", icon: Target, label: "New Lead", access: "new_lead_page", activeMatch: "exact" },
          { href: "/lead/old", icon: History, label: "Old Lead", access: "old_lead_page", activeMatch: "exact" },
          { href: "/lead/add", icon: UserPlus, label: "Add Lead", access: "add_lead_page", activeMatch: "exact" },
          { href: "/client", icon: Users, label: "Client", access: "client_page" },
        ],
      },
      {
        title: "MANAGEMENT", section: "management", icon: SlidersHorizontal,
        items: [
          { href: "/lead/manage", icon: Wrench, label: "Manage Leads", access: "lead_manage_page", activeMatch: "prefix" },
          { href: "/lead/manage/source", icon: Tag, label: "Lead Source", access: "lead_source_page", activeMatch: "exact" },
          { href: "/lead/manage/response", icon: MessagesSquare, label: "Lead Response", access: "lead_response_page", activeMatch: "exact" },
          { href: "/lead/manage/lead-upload", icon: UploadCloud, label: "Lead Upload", access: "lead_upload_page", activeMatch: "exact" },
          { href: "/lead/transfer", icon: Share, label: "Lead Transfer", access: "lead_transfer_page", activeMatch: "exact"},
        ],
      },
      {
        title: "CONFIGURATION", section: "configuration", icon: Settings,
        items: [
          { href: "/branch", icon: Building2, label: "Branch", access: "branch_page" },
          { href: "/department", icon: Building, label: "Department", access: "department_page" },
          { href: "/user", icon: UserCheck, label: "Users", access: "user_page" },
          // { href: "/user/attendance", icon: CalendarCheck, label: "Attendance", access: "attandance_page" },
          { href: "/plans", icon: ClipboardCheck, label: "Plans", access: "plane_page" },
          { href: "/permission", icon: ShieldCheck, label: "Permissions", access: "permission_page" },
        ],
      },
      { items: [{ href: "/payment", icon: CreditCard, label: "Payment", access: "payment_page" }] },
      {
        title: "RESEARCHER", items: [
          { href: "/rational", icon: MessageCircle, label: "Messenger", access: "messanger_page" },
          { href: "/research-report", icon: FileSearch, label: "Research Report", access: "research_report_page" },
        ]
      },
      { items: [{ href: "/chatting", icon: MessageSquare, label: "Chat", access: "chat_page" }] },
      { items: [{ href: "/mailing", icon: Mail, label: "Mail", access: "mail_page" }] },
      { items: [{ href: "/notice-board", icon: StickyNote, label: "Notice Board", access: "notice_board_page" }] },

      {
        title: "REPORTS", section: "reports", icon: PieChart,
        items: [
          { href: "/reports/client", icon: UserCog, label: "Client Report", access: "reports_client_page" },
          { href: "/reports/vbc", icon: PhoneCall, label: "VBC", access: "reports_vbc_page" },
        ],
      },

      {
        title: "TEMPLATE", section: "template", icon: FileText,
        items: [
          { href: "/email", icon: MailOpen, label: "Email", access: "email_page" },
          { href: "/sms", icon: MessageSquareText, label: "SMS", access: "sms_page" },
        ],
      },
    ],
    []
  );

  const filteredMenu = useMemo(() => {
    const can = (acc) => acc === "" || hasPermission(acc);
    const filterItems = (items = []) =>
      items.map((item) => {
        if (!item.href && Array.isArray(item.items)) {
          const sub = filterItems(item.items);
          if (!sub.length) return null;
          return { ...item, items: sub };
        }
        return can(item.access) ? item : null;
      }).filter(Boolean);

    return rawMenu.map((sec) => {
      if (sec.section) {
        const its = filterItems(sec.items);
        if (!its.length) return null;
        return { ...sec, items: its };
      }
      const its = filterItems(sec.items || []);
      if (!its.length) return null;
      return { ...sec, items: its };
    }).filter(Boolean);
  }, [rawMenu, hasPermission]);

  /* ----------------------------------- */
  return (
    <div
      className="h-full flex flex-col md:w-[var(--sbw)]"
      style={{
        width: widthPx,
        backgroundColor: sidebarVars.bg,
        color: sidebarVars.text,
        boxShadow: `inset -1px 0 0 ${sidebarVars.border}`
      }}
      role="navigation"
      aria-label="Sidebar"
    >
      {/* Mobile user block */}
      <MobileUser sidebarVars={sidebarVars} />

      {/* Scrollable nav */}
      <nav
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${collapsed ? 'px-1 py-3' : 'px-2 py-3'} no-scrollbar`}>
        {filteredMenu.map((section, idx) => (
          <div key={`sec-${idx}`} className="mb-3">
            {/* Section title (only non-collapsible groups) */}
            {!collapsed && section.title && !section.section && (
              <div className="px-3 py-2">
                <span
                  className="text-[10px] font-semibold tracking-[0.06em]"
                  style={{ color: sidebarVars.sectionTitle }}
                >
                  {section.title}
                </span>
              </div>
            )}

            {/* Collapsible sections in full mode */}
            {section.section && !collapsed ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggle(section.section)}
                  aria-expanded={!!expanded[section.section]}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md"
                  style={{
                    color: sidebarVars.text,
                    backgroundColor: "transparent"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = sidebarVars.hoverBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div className="flex items-center gap-2">
                    {/* Optional section icon can be added here if needed */}
                    <span className="text-[10px]" style={{ color: sidebarVars.sectionTitle }}>
                      {section.title}
                    </span>
                  </div>
                  {expanded[section.section] ? (
                    <ChevronDown size={16} style={{ color: sidebarVars.icon }} />
                  ) : (
                    <ChevronRight size={16} style={{ color: sidebarVars.icon }} />
                  )}
                </button>

                {expanded[section.section] && (
                  <ul className="mt-1 ml-1.5 space-y-1">
                    {section.items.map((item, j) =>
                      item.href ? (
                        <NavItem key={`item-${j}`} {...item} />
                      ) : (
                        <li key={`grp-${j}`} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggle(item.section)}
                            aria-expanded={!!expanded[item.section]}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md"
                            style={{ backgroundColor: "transparent", color: sidebarVars.text }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = sidebarVars.hoverBg; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            <div className="flex items-center gap-2">
                              <item.icon size={16} style={{ color: sidebarVars.icon }} />
                              <span className="text-[13px]" style={{ color: sidebarVars.text }}>{item.title}</span>
                            </div>
                            {expanded[item.section] ? (
                              <ChevronDown size={16} style={{ color: sidebarVars.icon }} />
                            ) : (
                              <ChevronRight size={16} style={{ color: sidebarVars.icon }} />
                            )}
                          </button>

                          {expanded[item.section] && (
                            <ul className="mt-1 ml-2 space-y-1">
                              {item.items.map((sub, k) => (
                                <NavItem key={`sub-${k}`} {...sub} />
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            ) : (
              // Non-collapsible section OR collapsed mini mode
              <ul className={`space-y-1 ${!collapsed && section.title && !section.section ? "ml-2" : ""}`}>
                {(
                  collapsed && section.section
                    ? section.items.flatMap(it => (it.items ? it.items : it)) // flatten when collapsed
                    : section.items
                ).map((item, i) =>
                  item.href ? (
                    <NavItem key={`leaf-${i}`} {...item} />
                  ) : null
                )}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
