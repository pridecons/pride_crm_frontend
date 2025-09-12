"use client";

import { useRouter, usePathname } from "next/navigation";
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

/* -----------------------------
   Helpers
----------------------------- */
function isPathActive(pathname, href, match = 'exact') {
  if (!pathname || !href) return false;
  if (match === 'prefix') {
    // active when the page is the same OR under this path
    return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  }
  // exact (default)
  return pathname === href;
}

/* -----------------------------
   Mobile Profile (only on md-)
----------------------------- */
function MobileProfile() {
  const [user, setUser] = useState(null);
  const [isConnect, setIsConnect] = useState(false);

  useEffect(() => {
    const accessToken = Cookies.get("access_token");
    const userInfo = Cookies.get("user_info");
    if (accessToken && userInfo) {
      const decoded = jwtDecode(accessToken);
      setUser({ ...JSON.parse(userInfo), role: decoded.role });
    }
  }, []);

  return (
    <div className="md:hidden flex items-center gap-3 p-4 border-b border-white/20">
      <div className="relative">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-tr from-blue-600 to-indigo-500">
          <User size={18} className="text-white" />
        </div>
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 ${
            isConnect ? "bg-green-500" : "bg-red-500"
          } rounded-full border-2 border-white`}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {user?.name || "User"}
        </p>
        <p className="text-[11px] text-slate-500">{user?.role || "Role"}</p>
      </div>
    </div>
  );
}

/* -----------------------------
   Sidebar
----------------------------- */
export default function Sidebar({ branchId, onClose }) {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    configuration: true,
    management: false, // subgroup toggle
  });
  const [hasMounted, setHasMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setHasMounted(true);
    const accessToken = Cookies.get("access_token");
    const userInfo = Cookies.get("user_info");
    if (accessToken && userInfo) {
      const decoded = jwtDecode(accessToken);
      setUser({ ...JSON.parse(userInfo), role: decoded.role_name });
    }
  }, []);

  const toggleSection = (key) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLogout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("user_info");
    router.push("/login");
  };

  const NavItem = ({ href, icon: Icon, label }) => {
    const active = isPathActive(pathname, href);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={[
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
          active
            ? "bg-white shadow-sm text-slate-900"
            : "text-slate-700 hover:bg-white/70",
        ].join(" ")}
      >
        {/* left accent when active */}
        <span
          className={[
            "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-xl",
            active ? "h-6 bg-blue-600" : "h-0",
          ].join(" ")}
        />
        <Icon
          size={18}
          className={
            active
              ? "text-blue-700"
              : "text-slate-500 group-hover:text-slate-700"
          }
        />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  };

  /* -----------------------------
     MENU DEFINITION (icons + groups)
  ----------------------------- */
  const rawMenu = useMemo(
    () => [
      // ---- MAIN ----
      {
        title: "Main",
        items: [{ href: "/dashboard", icon: Home, label: "Home", access: "" }],
      },

      // ---- LEADS ----
      {
        title: "Leads",
        section: "leads",
        icon: Target,
        items: [
          { href: "/lead", icon: Target, label: "New Lead", access: "new_lead_page" },
          { href: "/lead/old", icon: History, label: "Old Lead", access: "old_lead_page" },
          { href: "/lead/add", icon: UserPlus, label: "Add Lead", access: "add_lead_page" },
          { href: "/client", icon: Users, label: "Client", access: "client_page" },
        ],
      },

      // ---- MANAGEMENT (subgroup inside section) ----
      {
        title: "Management",
        section: "management",
        icon: SlidersHorizontal,
        items: [
          { href: "/lead/manage", icon: Wrench, label: "Manage Leads", access: "lead_manage_page" },
          { href: "/lead/manage/source", icon: Tag, label: "Lead Source", access: "lead_source_page" },
          { href: "/lead/manage/response", icon: MessageSquare, label: "Lead Response", access: "lead_response_page" },
          { href: "/lead/manage/fetch-limit", icon: Gauge, label: "Fetch Limit", access: "fetch_limit_page" },
          { href: "/lead/manage/lead-upload", icon: UploadCloud, label: "Lead Upload", access: "lead_upload_page" },
          { href: "/lead/manage/analytics", icon: BarChart3, label: "Lead Analytics", access: "" },
        ],
      },

      // ---- CONFIGURATION ----
      {
        title: "Configuration",
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

      // ---- PAYMENT ----
      {
        title: "Payment",
        items: [
          { href: "/payment", icon: CreditCard, label: "Payment", access: "payment_page" },
        ],
      },

      // ---- RESEARCHER ----
      {
        title: "Researcher",
        items: [
          { href: "/rational", icon: MessageCircle, label: "Messenger", access: "messanger_page" },
          // ⬇️ Added as requested
          { href: "/research-report", icon: FileText, label: "Research Report", access: "research_report_page" },
        ],
      },

      // ---- CHAT (separate group) ----
      {
        title: "Chat",
        items: [
          // ⬇️ Separate route as requested
          { href: "/chatting", icon: MessageSquare, label: "Chat", access: "chat_page" },
        ],
      },

      // ---- NOTICE BOARD (separate group) ----
      {
        title: "Notice Board",
        items: [
          // ⬇️ Separate route as requested
          { href: "/notice-board", icon: ClipboardList, label: "Notice Board", access: "notice_board_page" },
        ],
      },

      // ---- TEMPLATES ----
      {
        title: "Template",
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


  /* -----------------------------
     FILTER BY PERMISSIONS
  ----------------------------- */
  const filteredMenu = useMemo(() => {
    const canAccess = (access) => {
      if (Array.isArray(access)) {
        // section-level: keep if *any* access in list is granted
        return access.length === 0 || access.some((a) => hasPermission(a));
      }
      return access === "" || hasPermission(access);
    };

    const filterItems = (items = []) =>
      items
        .map((item) => {
          // subgroup (has .items but no href)
          if (!item.href && Array.isArray(item.items)) {
            const subItems = filterItems(item.items);
            if (subItems.length === 0) return null; // hide empty subgroup
            return { ...item, items: subItems };
          }
          // leaf nav item
          return canAccess(item.access) ? item : null;
        })
        .filter(Boolean);

    return rawMenu
      .map((section) => {
        // gate section if it has an access list (e.g., Template)
        if (section.access && !canAccess(section.access)) return null;

        if (section.section) {
          const items = filterItems(section.items || []);
          if (items.length === 0) return null; // hide empty section
          return { ...section, items };
        }

        const items = filterItems(section.items || []);
        if (items.length === 0) return null;
        return { ...section, items };
      })
      .filter(Boolean);
  }, [rawMenu, hasPermission]);

  if (!hasMounted) return null;

  return (
    <aside
      className="
        flex flex-col h-full
        bg-gradient-to-b from-slate-50 to-slate-100
        border-r border-white/50
        shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]
      "
    >
      {/* Profile (mobile) */}
      <MobileProfile />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4" role="navigation">
        {filteredMenu.map((section, idx) => (
          <div key={idx}>
            {section.section ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleSection(section.section)}
                  className="flex justify-between items-center w-full px-3 py-2.5 text-left text-slate-800 font-semibold bg-white/60 hover:bg-white rounded-xl transition border border-white/60"
                  aria-expanded={!!expandedSections[section.section]}
                >
                  <div className="flex items-center gap-2">
                    <section.icon size={16} className="text-slate-600" />
                    <span className="text-[13px]">{section.title}</span>
                  </div>
                  {expandedSections[section.section] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                {expandedSections[section.section] && (
                  <ul className="mt-2 ml-2 space-y-1">
                    {section.items.map((item, i) =>
                      item.href ? (
                        <li key={i}>
                          <NavItem {...item} />
                        </li>
                      ) : (
                        // subgroup like "Management"
                        <li key={i}>
                          <button
                            onClick={() => toggleSection(item.section)}
                            className="flex w-full items-center justify-between px-3 py-2 text-slate-800 bg-white/40 hover:bg-white rounded-xl border border-white/60"
                            aria-expanded={!!expandedSections[item.section]}
                          >
                            <div className="flex items-center gap-2">
                              <item.icon size={16} className="text-slate-600" />
                              <span className="text-[13px]">{item.title}</span>
                            </div>
                            {expandedSections[item.section] ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>

                          {expandedSections[item.section] && (
                            <ul className="mt-2 ml-2 space-y-1">
                              {item.items.map((sub, j) => (
                                <li key={j}>
                                  <NavItem {...sub} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </>
            ) : (
              <div>
                <p className="px-2 text-[11px] font-bold tracking-wide text-slate-500 mb-2 uppercase">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <NavItem {...item} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <footer className="p-3 border-t border-white/60 bg-white/70">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-left transition-all duration-200 group"
        >
          <div className="bg-red-100 rounded-full p-2 group-hover:bg-red-200 transition-colors">
            <LogOut size={16} className="text-red-600" />
          </div>
          <span className="text-sm font-medium text-red-600">Logout</span>
        </button>
      </footer>
    </aside>
  );
}
