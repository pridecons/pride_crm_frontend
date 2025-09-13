"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  Home,
  Target,
  History,
  UserPlus,
  Users,
  Building2,
  Building,
  Settings,
  FileText,
  Wrench,
  Tag,
  Gauge,
  UploadCloud,
  BarChart3,
  UserCheck,
  ShieldCheck,
  ClipboardList,
  CreditCard,
  Mail,
  MessageCircle,
  MessageSquare,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  SlidersHorizontal
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

/* -----------------------------------
   Helpers
----------------------------------- */
function isPathActive(pathname, href, match = "exact") {
  if (!pathname || !href) return false;
  const p = pathname.replace(/\/+$/, "");
  const h = href.replace(/\/+$/, "");
  if (match === "prefix") {
    return p === h || (h !== "/" && p.startsWith(h + "/"));
  }
  return p === h;
}

/* -----------------------------------
   Mini brand (CoreUI style)
----------------------------------- */


/* -----------------------------------
   Mobile user (only < md) 
----------------------------------- */
function MobileUser() {
  const [user, setUser] = useState(null);
  const [isConnect, setIsConnect] = useState(false);

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
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#2f353a] ${isConnect ? "bg-emerald-500" : "bg-red-500"
            }`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-slate-100 font-medium truncate">
          {user?.name || "User"}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {user?.role || "Role"}
        </p>
      </div>
    </div>
  );
}

/* -----------------------------------
   CoreUI-like Sidebar
   - dark palette
   - grouped sections
   - collapsible groups with chevrons
   - compact nav items
----------------------------------- */
export default function CoreSidebar({ open, onClose }) {
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

  const toggle = (key) =>
    setExpanded((s) => ({ ...s, [key]: !s[key] }));

  const NavItem = ({ href, icon: Icon, label, activeMatch = "exact" }) => {
    const active = isPathActive(pathname, href, activeMatch);
    return (
      <li>
        <Link
          href={href}
          onClick={onClose}
          className={[
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition",
            active
              ? "bg-slate-800/80 text-white"
              : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
          ].join(" ")}
        >
          <Icon size={16} className={active ? "text-white" : "text-slate-400"} />
          <span className="truncate">{label}</span>
        </Link>
      </li>
    );
  };

  /* ------------ MENU ------------- */
  const rawMenu = useMemo(
    () => [
      {
        items: [{ href: "/dashboard", icon: Home, label: "Home", access: "" }],
      },
      {
        title: "LEADS",
        section: "leads",
        icon: Target,
        items: [
          { href: "/lead", icon: Target, label: "New Lead", access: "new_lead_page", activeMatch: "exact" },
          { href: "/lead/old", icon: History, label: "Old Lead", access: "old_lead_page", activeMatch: "exact" },
          { href: "/lead/add", icon: UserPlus, label: "Add Lead", access: "add_lead_page", activeMatch: "exact" },
          { href: "/client", icon: Users, label: "Client", access: "client_page" },
          // subgroup
          {
            title: "MANAGEMENT",
            section: "management",
            icon: SlidersHorizontal,
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
        title: "CONFIGURATION",
        section: "configuration",
        icon: Settings,
        items: [
          { href: "/branch", icon: Building2, label: "Branch", access: "branch_page" },
          { href: "/department", icon: Building, label: "Department", access: "department_page" },
          { href: "/user", icon: UserCheck, label: "Users", access: "user_page" },
          { href: "/user/attendance", icon: CalendarCheck, label: "Attendance", access: "attandance_page" },
          { href: "/plans", icon: ClipboardList, label: "Plans", access: "plane_page" },
          { href: "/permission", icon: ShieldCheck, label: "Permissions", access: "permission_page" },
        ],
      },
      {
        
        items: [{ href: "/payment", icon: CreditCard, label: "Payment", access: "payment_page" }],
      },
      {
        title: "RESEARCHER",
        items: [
          { href: "/rational", icon: MessageCircle, label: "Messenger", access: "messanger_page" },
          { href: "/research-report", icon: FileText, label: "Research Report", access: "research_report_page" },
        ],
      },
      {
        title: "CHAT",
        items: [{ href: "/chatting", icon: MessageSquare, label: "Chat", access: "chat_page" }],
      },
      {
        title: "MAIL",
        items: [{ href: "/mailing", icon: Mail, label: "Mail", access: "mail_page"}],
      },
      {
        title: "NOTICE BOARD",
        items: [{ href: "/notice-board", icon: ClipboardList, label: "Notice Board", access: "notice_board_page" }],
      },
      {
        title: "TEMPLATE",
        section: "template",
        icon: FileText,
        items: [
          { href: "/email", icon: Mail, label: "Email", access: "email_page" },
          { href: "/sms", icon: MessageCircle, label: "SMS", access: "sms_page" },
        ],
      },
    ],
    []
  );

  /* -------- Permission filter ------- */
  const filteredMenu = useMemo(() => {
    const can = (acc) => (acc === "" || hasPermission(acc));

    const filterItems = (items = []) =>
      items
        .map((item) => {
          if (!item.href && Array.isArray(item.items)) {
            const sub = filterItems(item.items);
            if (!sub.length) return null;
            return { ...item, items: sub };
          }
          return can(item.access) ? item : null;
        })
        .filter(Boolean);

    return rawMenu
      .map((sec) => {
        if (sec.section) {
          const its = filterItems(sec.items);
          if (!its.length) return null;
          return { ...sec, items: its };
        }
        const its = filterItems(sec.items || []);
        if (!its.length) return null;
        return { ...sec, items: its };
      })
      .filter(Boolean);
  }, [rawMenu, hasPermission]);

  /* -----------------------------------
     RENDER
  ----------------------------------- */
  return (
    <aside
      className="
        fixed top-0 bottom-0 left-0 z-[40] w-64
        bg-gray-900 text-slate-200
        transition-transform duration-200
        flex flex-col"
      style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      role="navigation"
      aria-label="Sidebar"
    >
      <div className="h-16 px-3 flex items-center border-b border-black/10">
        <img src="/pride_logo_nobg.png" alt="Logo" width={130} height={55} />
      </div>

      {/* Mobile user */}
      <MobileUser />

      {/* Scrollable nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain thin-scroll px-2 py-3">
        {filteredMenu.map((section, idx) => (
          <div key={`sec-${idx}`} className="mb-3">
            {/* Section title (CoreUI uppercase) */}
            {section.title && (
              <div className="px-3 py-2">
                <span className="text-[10px] font-semibold tracking-[0.06em] text-slate-400">
                  {section.title}
                </span>
              </div>
            )}

            {/* If collapsible section */}
            {section.section ? (
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
                        // subgroup collapsible
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
              // Non-collapsible section
              <ul className="space-y-1">
                {section.items.map((item, i) => (
                  <NavItem key={`leaf-${i}`} {...item} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
