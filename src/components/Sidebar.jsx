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
  ChevronDown, ChevronRight, LogOut, User, SlidersHorizontal
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import { createPortal } from "react-dom";

/* ----------------------------------- */
function isPathActive(pathname, href, match = "exact") {
  if (!pathname || !href) return false;
  const p = pathname.replace(/\/+$/, "");
  const h = href.replace(/\/+$/, "");
  if (match === "prefix") return p === h || (h !== "/" && p.startsWith(h + "/"));
  return p === h;
}

/* ----------------------------------- */
function MobileUser() {
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
    <div className="md:hidden flex items-center gap-3 px-3 py-3 border-b border-black/10">
      <div className="relative">
        <div className="w-9 h-9 rounded-full grid place-items-center bg-slate-700">
          <User size={16} className="text-slate-200" />
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#2f353a] ${isConnect ? "bg-emerald-500" : "bg-red-500"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-slate-100 font-medium truncate">{user?.name || "User"}</p>
        <p className="text-[11px] text-slate-400 truncate">{user?.role || "Role"}</p>
      </div>
    </div>
  );
}

/* ----------------------------------- */
export default function CoreSidebar({ collapsed = false, widthPx = 256, onClose }) {
  const { hasPermission } = usePermissions();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [expanded, setExpanded] = useState({
    leads: true,
    management: false,
    configuration: true,
    template: false,
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
        <div className="rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-lg whitespace-nowrap">
          {label}
        </div>
      </div>,
      document.body
    );
  }

  const NavItem = ({ href, icon: Icon, label, activeMatch = "exact" }) => {
    const active = isPathActive(pathname, href, activeMatch);
    const base = "rounded-md text-[13px] transition leading-none";
    const palette = active
      ? "bg-slate-800/80 text-white"
      : "text-slate-300 hover:bg-slate-800/60 hover:text-white";

    const [tip, setTip] = useState({ show: false, x: 0, y: 0 });
    const iconRef = useState(null)[0] || (typeof window !== "undefined" ? { current: null } : { current: null }); // safe init
    const setIconRef = (el) => (iconRef.current = el);

    const handleEnter = () => {
      if (!collapsed || !iconRef.current) return;
      const r = iconRef.current.getBoundingClientRect();
      // place tooltip 10px to the right, vertically centered with the icon box
      setTip({ show: true, x: r.right + 10, y: r.top + r.height / 2 });
    };
    const handleLeave = () => setTip((t) => ({ ...t, show: false }));

    return (
      <li>
        <Link
          href={href}
          onClick={onClose}
          aria-label={label}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          className={[
            "flex items-center",
            collapsed ? "justify-center h-10 w-10" : "gap-2.5 px-3 py-2",
            base,
            palette,
          ].join(" ")}
        >
          {/* anchor element for measuring */}
          <span
            ref={setIconRef}
            className={collapsed ? "h-10 w-10 grid place-items-center" : "grid place-items-center"}
          >
            <Icon size={18} className={active ? "text-white" : "text-slate-400"} />
          </span>

          {!collapsed && <span className="truncate">{label}</span>}
        </Link>

        {/* fixed-position tooltip rendered to body */}
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
          {
            title: "MANAGEMENT", section: "management", icon: SlidersHorizontal,
            items: [
              { href: "/lead/manage", icon: Wrench, label: "Manage Leads", access: "lead_manage_page", activeMatch: "prefix" },
              { href: "/lead/manage/source", icon: Tag, label: "Lead Source", access: "lead_source_page", activeMatch: "exact" },
              { href: "/lead/manage/response", icon: MessageSquare, label: "Lead Response", access: "lead_response_page", activeMatch: "exact" },
              { href: "/lead/manage/fetch-limit", icon: Gauge, label: "Fetch Limit", access: "fetch_limit_page", activeMatch: "exact" },
              { href: "/lead/manage/lead-upload", icon: UploadCloud, label: "Lead Upload", access: "lead_upload_page", activeMatch: "exact" },
              { href: "/lead/manage/analytics", icon: BarChart3, label: "Lead Analytics", access: "lead_analytics_page", activeMatch: "exact" },
            ],
          },
        ],
      },
      {
        title: "CONFIGURATION", section: "configuration", icon: Settings,
        items: [
          { href: "/branch", icon: Building2, label: "Branch", access: "branch_page" },
          { href: "/department", icon: Building, label: "Department", access: "department_page" },
          { href: "/user", icon: UserCheck, label: "Users", access: "user_page" },
          { href: "/user/attendance", icon: CalendarCheck, label: "Attendance", access: "attandance_page" },
          { href: "/plans", icon: ClipboardList, label: "Plans", access: "plane_page" },
          { href: "/permission", icon: ShieldCheck, label: "Permissions", access: "permission_page" },
        ],
      },
      { items: [{ href: "/payment", icon: CreditCard, label: "Payment", access: "payment_page" }] },
      {
        title: "RESEARCHER", items: [
          { href: "/rational", icon: MessageCircle, label: "Messenger", access: "messanger_page" },
          { href: "/research-report", icon: FileText, label: "Research Report", access: "research_report_page" },
        ]
      },
      { title: "CHAT", items: [{ href: "/chatting", icon: MessageSquare, label: "Chat", access: "chat_page" }] },
      { title: "MAIL", items: [{ href: "/mailing", icon: Mail, label: "Mail", access: "mail_page" }] },
      { title: "NOTICE BOARD", items: [{ href: "/notice-board", icon: ClipboardList, label: "Notice Board", access: "notice_board_page" }] },
      {
        title: "TEMPLATE", section: "template", icon: FileText,
        items: [
          { href: "/email", icon: Mail, label: "Email", access: "email_page" },
          { href: "/sms", icon: MessageCircle, label: "SMS", access: "sms_page" },
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
      className="h-full bg-gray-900 text-slate-200 flex flex-col md:w-[var(--sbw)]"
      style={{ width: widthPx }} // for mobile slide-in width
      role="navigation"
      aria-label="Sidebar"
    >

      {/* Mobile user block */}
      <MobileUser />

      {/* Scrollable nav */}
      <nav
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${collapsed ? 'px-1 py-3' : 'px-2 py-3'} no-scrollbar`}>
        {filteredMenu.map((section, idx) => (
          <div key={`sec-${idx}`} className="mb-3">
            {/* Section title */}
            {!collapsed && section.title && (
              <div className="px-3 py-2">
                <span className="text-[10px] font-semibold tracking-[0.06em] text-slate-400">
                  {section.title}
                </span>
              </div>
            )}

            {/* Collapsible sections only expand in full mode.
                In collapsed mode we show only their direct leaf items (flattened). */}
            {section.section && !collapsed ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggle(section.section)}
                  aria-expanded={!!expanded[section.section]}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-slate-100 bg-slate-800/50 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <section.icon size={16} className="text-slate-300" />
                    <span className="text-[13px]">{section.title}</span>
                  </div>
                  {expanded[section.section] ? (
                    <ChevronDown size={16} className="text-slate-300" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
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
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800/60"
                          >
                            <div className="flex items-center gap-2">
                              <item.icon size={16} className="text-slate-400" />
                              <span className="text-[13px]">{item.title}</span>
                            </div>
                            {expanded[item.section] ? (
                              <ChevronDown size={16} className="text-slate-300" />
                            ) : (
                              <ChevronRight size={16} className="text-slate-400" />
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
              <ul className="space-y-1">
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
