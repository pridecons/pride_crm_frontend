'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { X, Menu, Search, User, Clock, Eye, EyeOff, Lock, Loader2, LogOut } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { axiosInstance, BASE_URL_full } from '@/api/Axios';
import toast from 'react-hot-toast';
import { createPortal } from "react-dom";
import { usePermissions } from "@/context/PermissionsContext";
import ShowNotifications from "./Notofication/ShowNotifications";
import { doLogout } from "@/utils/logout";
import { ErrorHandling } from "@/helper/ErrorHandling";
import ShowChatCount from "./chatting/ShowChatCount";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import { MiniLoader } from "./LoadingState";
import Logo from "./Logo";

/* ------------ helpers ------------ */
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

function useViewerIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    try {
      const uiRaw = Cookies.get("user_info");
      let role = "";
      if (uiRaw) {
        const ui = JSON.parse(uiRaw);
        role =
          ui?.role_name || ui?.role ||
          ui?.user?.role_name || ui?.user?.role ||
          ui?.profile_role?.name || "";
      } else {
        const token = Cookies.get("access_token");
        if (token) {
          const p = jwtDecode(token) || {};
          role = p?.role_name || p?.role || p?.profile_role?.name || p?.user?.role || "";
        }
      }
      const key = String(role || "").trim().toUpperCase().replace(/\s+/g, "_");
      setIsSuperAdmin(key === "SUPERADMIN" || key === "SUPER_ADMINISTRATOR");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);
  return isSuperAdmin;
}

const CHAT_UNREAD_VIA_HTTP = false;

function getUserFromCookies() {
  try {
    const raw = Cookies.get('user_info');
    const parsed = raw ? JSON.parse(raw) : {};
    const name =
      parsed?.name ??
      parsed?.user?.name ??
      parsed?.user_info?.name ??
      'User';

    const role_label =
      parsed?.role ??
      parsed?.role_name ??
      parsed?.user?.role ??
      parsed?.user?.role_name ??
      parsed?.user_info?.role ??
      parsed?.user_info?.role_name ??
      '';

    const employee_code =
      parsed?.employee_code ??
      parsed?.user?.employee_code ??
      parsed?.user_info?.employee_code ??
      '';

    return {
      ...parsed,
      name,
      role_label,
      employee_code,
    };
  } catch {
    return null;
  }
}

export default function Header({ onMenuClick, onSearch, sidebarOpen }) {
  const { themeConfig } = useTheme();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const handleLogout = () => doLogout(router);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);

  // ---- Global Search state ----
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [expanded, setExpanded] = useState(false);

  const searchWrapRef = useRef(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const portalHostRef = useRef(null);

  // ---- Quick Filter (Responses) ----
  const [respOptions, setRespOptions] = useState([]);
  const [respMatches, setRespMatches] = useState([]);

  // ---- Branch & Source ----
  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);

  // ---- Clock ----
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isConnect, setIsConnect] = useState(false);

  const [respCounts, setRespCounts] = useState({});
  const [activeResponse, setActiveResponse] = useState('ALL');
  const [openGroups, setOpenGroups] = useState({});
  const [responseCounts, setResponseCounts] = useState({});
  const [anchorRect, setAnchorRect] = useState(null);
  const lookupsLoadedRef = useRef(false);

  const [showChangePassword, setShowChangePassword] = useState(false);

  const viewerIsSuperAdmin = useViewerIsSuperAdmin();

  // ---- Header tokens (from theme.components.header with fallback) ----
  const headerVars = (themeConfig && themeConfig.components && themeConfig.components.header)
    ? themeConfig.components.header
    : {
      bg: themeConfig.header,
      text: themeConfig.headerText,
      border: themeConfig.border,
      shadow: themeConfig.shadow
    };

  /** ✅ auth bootstrap: set axios auth + extract user for header */
  useEffect(() => {
    const u = getUserFromCookies();
    if (u) setUser(u);
  }, []);

  const loadLookupsIfNeeded = useCallback(async () => {
    if (lookupsLoadedRef.current) return;
    lookupsLoadedRef.current = true;
    try {
      const [{ data: responses }, { data: sources }, { data: branches }] =
        await Promise.all([
          axiosInstance.get('/lead-config/responses/'),
          axiosInstance.get('/lead-config/sources/'),
          axiosInstance.get('/branches/?skip=0&limit=200'),
        ]);
      setRespOptions(Array.isArray(responses) ? responses : []);
      setSourceOptions(Array.isArray(sources) ? sources : []);
      setBranchOptions(Array.isArray(branches?.items || branches) ? (branches.items || branches) : []);
    } catch (e) {
      ErrorHandling({ error: e, defaultError: "Failed loading lookups." });
    }
  }, []);

  const respSummary = useMemo(() => {
    return (respOptions || [])
      .map(r => ({ id: r.id, name: r.name, count: respCounts[r.id] || 0 }))
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [respOptions, respCounts]);

  const respMap = useMemo(() => {
    const m = {};
    for (const r of respOptions || []) if (r?.id != null && r.name) m[r.id] = r.name;
    return m;
  }, [respOptions]);

  const branchMap = useMemo(() => {
    const m = {};
    for (const b of branchOptions || []) if (b?.id != null && b.name) m[b.id] = b.name;
    return m;
  }, [branchOptions]);

  const sourceMap = useMemo(() => {
    const m = {};
    for (const s of sourceOptions || []) if (s?.id != null && s.name) m[s.id] = s.name;
    return m;
  }, [sourceOptions]);

  const responseTabs = useMemo(() => {
    return Object.entries(responseCounts)
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  }, [responseCounts]);

  const groupedByResponse = useMemo(() => {
    const buckets = {};
    for (const l of suggestions || []) {
      const name = getResponseName(l, respMap);
      if (activeResponse === 'ALL' || name === activeResponse) {
        if (!buckets[name]) buckets[name] = [];
        buckets[name].push(l);
      }
    }
    return Object.entries(buckets).sort(
      (a, b) => (b[1].length - a[1].length) || a[0].localeCompare(b[0])
    );
  }, [suggestions, activeResponse, respMap]);

  useEffect(() => {
    const init = {};
    for (const [k] of groupedByResponse) init[k] = true;
    setOpenGroups(init);
  }, [groupedByResponse]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let host = document.getElementById('global-search-portal');
    if (!host) {
      host = document.createElement('div');
      host.id = 'global-search-portal';
      document.body.appendChild(host);
    }
    portalHostRef.current = host;
    return () => { portalHostRef.current = null; };
  }, []);

  const visibleLeads = useMemo(() => {
    const out = [];
    for (const [group, items] of groupedByResponse) {
      if (openGroups[group]) out.push(...items);
    }
    return out;
  }, [groupedByResponse, openGroups]);

  useEffect(() => { if (open) loadLookupsIfNeeded(); }, [open, loadLookupsIfNeeded]);

  const RESPONSE_ALIASES = {
    "call back": ["cb", "callback", "call back"],
    "not picked": ["npc", "no pickup", "not picked", "not picked call"],
    "interested": ["int", "interested"],
    "not interested": ["ni", "not interested"],
  };

  const norm = (s) => String(s || "").trim().toLowerCase();

  const buildResponseMatches = (q, options) => {
    const term = norm(q);
    if (term.length < 2) return [];
    return (options || [])
      .filter(r => {
        const name = norm(r?.name);
        const aliases = RESPONSE_ALIASES[name] || [];
        return name.includes(term) || aliases.some(a => term.startsWith(a) || a.startsWith(term));
      })
      .slice(0, 5)
      .map(r => ({ id: r.id, name: r.name }));
  };

  const profileRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target) &&
        (!overlayRef.current || !overlayRef.current.contains(e.target))) {
        setOpen(false);
        setExpanded(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    const id = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(query);
      if (typeof window !== 'undefined') sessionStorage.setItem('globalSearchQuery', query);
    }, 500);
    return () => clearTimeout(id);
  }, [query, onSearch]);

  function getResponseName(lead) {
    return lead?.lead_response_name || "No Response";
  }

  const fetchSuggestions = useCallback(async (q) => {
    const term = (q || "").trim();
    if (term.length < 2) {
      try { abortRef.current?.abort(); } catch { }
      setSuggestions([]); setRespCounts({}); setRespMatches([]); setResponseCounts({}); setLoading(false);
      return;
    }

    try { abortRef.current?.abort(); } catch { }
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const url = `/leads/search/?q=${encodeURIComponent(term)}&search_type=all`;
      const { data } = await axiosInstance.get(url, {
        signal: ac.signal,
        baseURL: BASE_URL_full,
      });

      const assignedRaw =
        Array.isArray(data?.leads)
          ? data.leads
          : (Array.isArray(data) ? data : (data?.items || data?.results || []));
      const activateRaw = Array.isArray(data?.activate_leads) ? data.activate_leads : [];

      const normalize = (l) => {
        const au = l?.assigned_user || null;
        const isMine =
          !!au?.employee_code &&
          !!user?.employee_code &&
          au.employee_code === user.employee_code;

        const masked =
          !!l?.is_masked ||
          /\*/.test(String(l?.mobile || "")) ||
          /\*/.test(String(l?.email || ""));

        return {
          id: l?.id ?? null,
          full_name: l?.full_name ?? null,
          mobile: l?.mobile ?? "",
          email: l?.email ?? "",

          lead_response_id: l?.lead_response_id ?? null,
          lead_response_name: l?.lead_response_name ?? "",
          source_id: l?.lead_source_id ?? null,
          branch_id: l?.branch_id ?? null,

          assigned_user: au,
          assigned_to_code: au?.employee_code ?? "",
          assigned_to_name: au?.name ?? "",
          assigned_to_role: au?.role ?? "",

          is_masked: !!l?.is_masked,
          created_at: l?.created_at ?? null,
          response_changed_at: l?.response_changed_at ?? null,

          __masked: masked,
          __assigned: isMine,

          __clickable: !masked && !!l?.id,
        };
      };

      const normalizeActivate = (l) => {
        const safeId = l?.id ?? `act:${l?.mobile || l?.email || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))}`;
        return normalize({ ...l, id: safeId });
      };

      const assigned = (Array.isArray(assignedRaw) ? assignedRaw : []).map(normalize).filter(x => x?.id != null);
      const others = (Array.isArray(activateRaw) ? activateRaw : []).map(normalizeActivate);

      const list = [...assigned, ...others].slice(0, 50);

      const countsByName = {};
      for (const l of list) {
        const rname = l?.lead_response_name || "No Response";
        countsByName[rname] = (countsByName[rname] || 0) + 1;
      }

      setResponseCounts(countsByName);
      setSuggestions(list);
      setRespMatches(buildResponseMatches(term, respOptions));
    } catch (err) {
      const canceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (!canceled) ErrorHandling({ error: err, defaultError: "Search failed." });
      setSuggestions([]); setRespCounts({}); setResponseCounts({});
      setRespMatches(buildResponseMatches(term, respOptions));
    } finally {
      setLoading(false);
    }
  }, [respOptions, user]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => { fetchSuggestions(query); }, 250);
    return () => clearTimeout(id);
  }, [open, query, fetchSuggestions]);

  useEffect(() => {
    if (!open || !searchWrapRef.current) return;
    const el = searchWrapRef.current;
    const update = () => setAnchorRect(el.getBoundingClientRect());
    requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    const onScroll = () => update();
    window.addEventListener('scroll', onScroll, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, expanded]);

  const handleSelect = (lead) => {
    setOpen(false); setExpanded(false); setHighlight(-1);
    setQuery(lead?.full_name || '');

    if (lead?.__clickable && lead?.id) {
      router.push(`/lead/${lead.id}`);
      return;
    }

    if (lead?.__masked) {
      ErrorHandling({ defaultError: "This Lead Is Not Assigned To You." });
      return;
    }

    ErrorHandling({ defaultError: "This item can’t be opened." });
  };

  const handleEnterNoPick = () => {
    setOpen(false); setExpanded(false); setHighlight(-1);
    if (typeof onSearch === 'function') onSearch(query);
  };

  const onKeyDown = (e) => {
    const total = visibleLeads.length;
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); setExpanded(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min((h ?? -1) + 1, Math.max(total - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max((h ?? -1) - 1, 0)); }
    else if (e.key === 'Enter') {
      if (open && total && highlight >= 0) { e.preventDefault(); handleSelect(visibleLeads[highlight]); }
      else { handleEnterNoPick(); }
    } else if (e.key === 'Escape') {
      setOpen(false); setExpanded(false); setHighlight(-1);
    }
  };

  const handleResponseFilterClick = (respName) => {
    setOpen(false); setExpanded(false); setHighlight(-1);
    router.push(`/search?kind=response&value=${encodeURIComponent(respName)}`);
  };

  const toggleProfileMenu = () => setShowProfileMenu(p => !p);

  const searchWidthCls = expanded
    ? "sm:max-w-[720px] md:max-w-[840px] lg:max-w-[960px]"
    : "sm:max-w-md";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{
        // HEADER CSS from theme.components.header
        backgroundColor: headerVars.bg,
        color: headerVars.text,
        boxShadow: `0 4px 12px ${hexToRgba(headerVars.shadow || "#000000", 0.25)}`
      }}
    >
      <div
        className="h-full"
        style={{
          backgroundColor: headerVars.bg,
          borderBottom: `1px solid ${headerVars.border}`,
          color: headerVars.text
        }}
      >
        <div className="h-full px-4 lg:px-4 flex items-center justify-between relative">
          {/* Left cluster */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg transition duration-150"
              aria-label="Toggle sidebar"
              style={{
                color: themeConfig.text,
                backgroundColor: themeConfig.surface,
                border: `1px solid ${themeConfig.border}`
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.08); }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.surface; }}
            >
              <Menu size={20} />
            </button>

            <div className="relative">
              <Logo
                src="/crm.png"
                darkSrc="/crm.png"  // optional
                width={128}
                height={40}
                href="/dashboard"
              />
              <div
                className="absolute -inset-2 rounded-lg transition-opacity duration-200 -z-10"
                style={{
                  background: `linear-gradient(90deg, ${hexToRgba(themeConfig.primary, 0.2)}, ${hexToRgba(themeConfig.accent, 0.2)})`,
                  opacity: 0
                }}
              />
            </div>
          </div>

          {/* -------- Global Search -------- */}
          {hasPermission("header_global_search") && (
            <div
              className={`flex-1 ${searchWidthCls} mx-3 hidden sm:block transition-all duration-200`}
              ref={searchWrapRef}
            >
              <div className="relative group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                  size={16}
                  style={{ color: themeConfig.textSecondary }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search lead by name, phone, or email…"
                  className={`w-full pl-10 pr-10 py-2 rounded-xl transition outline-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none ${open ? 'invisible pointer-events-none' : ''}`}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value) }}
                  onKeyDown={onKeyDown}
                  onFocus={() => {
                    setExpanded(true);
                    requestAnimationFrame(() => {
                      const el = searchWrapRef.current;
                      if (!el) return;
                      setAnchorRect(el.getBoundingClientRect());
                      setOpen(true);
                      if (inputRef.current) inputRef.current.blur();
                    });
                  }}
                  autoComplete="off"
                  style={{
                    backgroundColor: themeConfig.inputBackground,
                    color: themeConfig.text,
                    border: `1px solid ${themeConfig.inputBorder}`
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 2px 10px ${hexToRgba(themeConfig.shadow || "#000", 0.2)}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                  onFocusCapture={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.inputFocus;
                    e.currentTarget.style.backgroundColor = themeConfig.cardBackground;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = themeConfig.inputBorder;
                    e.currentTarget.style.backgroundColor = themeConfig.inputBackground;
                  }}
                />
                {/* Right-side adornment: spinner when loading, otherwise clear button */}
                {loading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <MiniLoader />
                  </div>
                ) : (
                  query && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      style={{ color: themeConfig.textSecondary }}
                    >
                      <X size={16} />
                    </button>
                  )
                )}

                {open && anchorRect && portalHostRef.current && (
                  <SearchOverlay
                    key="global-search-overlay"
                    anchorRect={anchorRect}
                    overlayRef={overlayRef}
                    portalHost={portalHostRef.current}
                    query={query}
                    setQuery={setQuery}
                    onClose={() => { setOpen(false); setExpanded(false); setHighlight(-1); }}
                    loading={loading}
                    responseTabs={responseTabs}
                    responseCounts={responseCounts}
                    activeResponse={activeResponse}
                    setActiveResponse={setActiveResponse}
                    groupedByResponse={groupedByResponse}
                    openGroups={openGroups}
                    setOpenGroups={setOpenGroups}
                    visibleLeads={visibleLeads}
                    highlight={highlight}
                    setHighlight={setHighlight}
                    handleSelect={handleSelect}
                    respMap={respMap}
                    branchMap={branchMap}
                    sourceMap={sourceMap}
                    onEnterNoPick={handleEnterNoPick}
                    showBranch={viewerIsSuperAdmin}
                  />
                )}
              </div>
            </div>
          )}
          {/* -------- /Global Search -------- */}

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex">

              <ShowNotifications setIsConnect={setIsConnect} employee_code={user?.employee_code} />

              {/* {hasPermission("chat_page") && <ShowChatCount user={user?.employee_code} />} */}

            </div>
            {/* Clock */}
            <div
              className="hidden md:flex items-center gap-2 px-2 py-1.5 rounded-xl border"
              style={{
                background: themeConfig.surface,
                borderColor: themeConfig.border,
                color: themeConfig.text
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full p-1"
                  style={{ backgroundColor: hexToRgba(themeConfig.primary, 0.15) }}
                >
                  <Clock size={14} style={{ color: themeConfig.primary }} />
                </div>
                <div className="text-sm">
                  <div className="font-semibold" style={{ color: themeConfig.text }}>{currentTime}</div>
                  <div className="text-xs" style={{ color: themeConfig.textSecondary }}>{currentDate}</div>
                </div>
              </div>
            </div>

            {/* Profile (md+) */}
            <div className="relative hidden md:block" ref={profileRef}>
              <button
                type="button"
                onClick={toggleProfileMenu}
                className="flex items-center space-x-2 px-1.5 py-1 rounded-xl transition-all duration-200"
                style={{
                  color: themeConfig.text,
                  backgroundColor: themeConfig.surface,
                  border: `1px solid ${themeConfig.border}`
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.surface; }}
              >
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(90deg, ${themeConfig.primary}, ${themeConfig.accent})`,
                      boxShadow: `0 6px 16px ${hexToRgba(themeConfig.primary, 0.35)}`
                    }}
                  >
                    <User size={18} className="text-white" />
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2"
                    style={{
                      backgroundColor: isConnect ? themeConfig.success : themeConfig.error,
                      borderColor: themeConfig.cardBackground
                    }}
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold" style={{ color: themeConfig.text }}>{user?.name || "User"}</p>
                  <p className="text-xs" style={{ color: themeConfig.textSecondary }}>{user?.role_label || "Role"}</p>
                </div>
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-42 rounded-2xl shadow-2xl border z-50 overflow-hidden"
                  style={{
                    backgroundColor: themeConfig.cardBackground,
                    borderColor: themeConfig.border,
                    color: themeConfig.text,
                    boxShadow: `0 20px 40px ${hexToRgba(themeConfig.shadow || "#000", 0.25)}`
                  }}
                >
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition"
                      style={{ color: themeConfig.text }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <Lock size={16} style={{ color: themeConfig.textSecondary }} /> Change password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition"
                      style={{ color: themeConfig.error }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.error, 0.08); }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
}

/* ---------------- SearchOverlay ---------------- */
function SearchOverlay({
  anchorRect,
  portalHost,
  query, setQuery, onClose,
  loading,
  responseTabs, responseCounts,
  activeResponse, setActiveResponse,
  groupedByResponse, openGroups, setOpenGroups,
  visibleLeads, highlight, setHighlight,
  handleSelect, respMap, branchMap, sourceMap,
  onEnterNoPick,
  overlayRef,
  showBranch,
}) {
  const { themeConfig } = useTheme();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const overlayInputRef = useRef(null);

  useEffect(() => {
    if (overlayInputRef.current && overlayInputRef.current.focus) {
      overlayInputRef.current.focus({ preventScroll: true });
    }
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalCount = Object.values(responseCounts).reduce((a, b) => a + b, 0) || 0;

  const content = (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div
        ref={overlayRef}
        className="absolute z-[1001] pointer-events-auto rounded-2xl overflow-hidden"
        style={{
          top: anchorRect.top,
          left: anchorRect.left,
          width: anchorRect.width,
          backgroundColor: themeConfig.cardBackground,
          border: `1px solid ${themeConfig.border}`,
          color: themeConfig.text,
          boxShadow: `0 20px 40px ${hexToRgba(themeConfig.shadow || "#000000", 0.25)}`
        }}
      >
        {/* Top search bar */}
        <div
          className="p-3"
          style={{ borderBottom: `1px solid ${themeConfig.border}`, backgroundColor: themeConfig.surface }}
        >
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              size={16}
              style={{ color: themeConfig.textSecondary }}
            />
            <input
              ref={overlayInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                const total = visibleLeads.length;
                if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min((h ?? -1) + 1, Math.max(total - 1, 0))); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max((h ?? -1) - 1, 0)); }
                else if (e.key === "Enter") {
                  if (total && highlight >= 0) { e.preventDefault(); handleSelect(visibleLeads[highlight]); }
                  else { onEnterNoPick(); }
                }
              }}
              placeholder="Search lead by name, phone, or email…"
              className="w-full pl-10 pr-10 py-3 rounded-xl text-[15px] outline-none"
              style={{
                backgroundColor: themeConfig.inputBackground,
                color: themeConfig.text,
                border: `1px solid ${themeConfig.inputBorder}`
              }}
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{ color: themeConfig.textSecondary }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="sticky top-0"
          style={{ backgroundColor: themeConfig.cardBackground, borderBottom: `1px solid ${themeConfig.border}` }}
        >
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveResponse('ALL')}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs border transition"
              style={{
                backgroundColor: activeResponse === 'ALL' ? themeConfig.text : themeConfig.surface,
                color: activeResponse === 'ALL' ? themeConfig.cardBackground : themeConfig.text,
                borderColor: activeResponse === 'ALL' ? themeConfig.text : themeConfig.border
              }}
            >
              All <span className="ml-2 text-[10px]" style={{ opacity: 0.8 }}>{totalCount}</span>
            </button>

            {responseTabs.map(([name, count]) => (
              <button
                key={`tab-${name}`}
                onClick={() => setActiveResponse(name)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs border transition"
                title={`Filter: ${name}`}
                style={{
                  backgroundColor: activeResponse === name ? themeConfig.primary : themeConfig.surface,
                  color: activeResponse === name ? "#fff" : themeConfig.text,
                  borderColor: activeResponse === name ? themeConfig.primary : themeConfig.border
                }}
              >
                {name}
                <span className="ml-2 text-[10px]" style={{ opacity: activeResponse === name ? 0.9 : 0.7 }}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto">
          {loading && visibleLeads.length === 0 && (
            <div className="py-10 flex items-center justify-center gap-3">
              <MiniLoader />
              <span className="text-sm" style={{ color: themeConfig.textSecondary }}>
                Searching…
              </span>
            </div>
          )}

          {!loading && visibleLeads.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: themeConfig.textSecondary }}>
              No matching leads. Press <span className="font-semibold" style={{ color: themeConfig.text }}>Enter</span> to run a full search.
            </div>
          )}

          {!loading && groupedByResponse.map(([groupName, items]) => {
            const open = !!openGroups[groupName];
            return (
              <div key={`grp-${groupName}`} style={{ borderBottom: `1px solid ${themeConfig.border}` }}>
                <button
                  type="button"
                  onClick={() => setOpenGroups(prev => ({ ...prev, [groupName]: !open }))}
                  className="w-full flex items-center justify-between px-3 py-2"
                  title={`Toggle ${groupName}`}
                  style={{
                    backgroundColor: themeConfig.surface,
                    color: themeConfig.text
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.surface; }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-md"
                      style={{ border: `1px solid ${themeConfig.border}`, color: themeConfig.text }}
                    >
                      {open ? '−' : '+'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: themeConfig.text }}>{groupName}</span>
                  </div>
                  <span className="text-[11px]" style={{ color: themeConfig.textSecondary }}>{items.length}</span>
                </button>

                {open && (
                  <ul>
                    {items.map((lead, index) => {
                      const active = visibleLeads[highlight]?.id === lead.id;
                      const rName = lead.lead_response_name || respMap[lead.lead_response_id] || 'No Response';
                      const bName = branchMap[lead.branch_id] || lead.branch_name || '—';
                      const sName =
                        sourceMap[lead.source_id ?? lead.lead_source_id] ||
                        lead.source_name ||
                        lead.lead_source_name ||
                        '—';
                      const aName =
                        lead.assigned_to_name ||
                        (lead.__assigned ? 'You' : '—');
                      const aCode = lead.assigned_to_code || '';
                      const aRole = lead.assigned_to_role || '';
                      const title = lead.full_name || lead.name || lead.client_name || 'Unnamed';
                      const phone = lead.phone || lead.mobile || lead.mobile_no || lead.contact_no || '';
                      const email = lead.email || lead.email_id || '';

                      return (
                        <li
                          key={index}
                          onMouseEnter={() => {
                            const idx = visibleLeads.findIndex(v => v.id === lead.id);
                            if (idx >= 0) setHighlight(idx);
                          }}
                          onClick={() => handleSelect(lead)}
                          className="px-3 py-2 transition"
                          style={{
                            cursor: lead.__clickable ? "pointer" : "not-allowed",
                            opacity: lead.__clickable ? 1 : 0.6,
                            backgroundColor: active ? hexToRgba(themeConfig.primary, 0.08) : themeConfig.cardBackground,
                            color: themeConfig.text,
                            borderTop: `1px solid ${hexToRgba(themeConfig.border, 0.5)}`
                          }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.cardBackground; }}
                        // onMouseEnter={(e) => {
                        //   if (!active) e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.05);
                        // }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: themeConfig.text }}>
                                {title}
                                {phone ? <span className="ml-2 font-normal" style={{ color: themeConfig.textSecondary }}>• {phone}</span> : null}
                                {email ? <span className="ml-2 font-normal truncate" style={{ color: themeConfig.textSecondary }}>• {email}</span> : null}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                                <span
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{
                                    border: `1px solid ${hexToRgba(themeConfig.primary, 0.3)}`,
                                    backgroundColor: hexToRgba(themeConfig.primary, 0.08),
                                    color: themeConfig.primary
                                  }}
                                >
                                  {rName}
                                </span>
                                {showBranch && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full"
                                    style={{ border: `1px solid ${themeConfig.border}`, backgroundColor: themeConfig.surface, color: themeConfig.text }}
                                  >
                                    Branch: {bName}
                                  </span>
                                )}
                                <span
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{ border: `1px solid ${themeConfig.border}`, backgroundColor: themeConfig.surface, color: themeConfig.text }}
                                >
                                  Source: {sName}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{
                                    border: `1px solid ${themeConfig.border}`,
                                    backgroundColor: hexToRgba(themeConfig.accent, 0.08),
                                    color: themeConfig.accent
                                  }}
                                >
                                  Assigned: {aName}
                                  {aCode ? ` (${aCode})` : ''}
                                  {aRole ? ` • ${aRole}` : ''}
                                </span>
                                {lead.response_changed_at && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full"
                                    style={{ border: `1px solid ${themeConfig.border}`, backgroundColor: themeConfig.surface, color: themeConfig.textSecondary }}
                                  >
                                    Resp @ {new Date(lead.response_changed_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {lead.created_at && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full"
                                    style={{ border: `1px solid ${themeConfig.border}`, backgroundColor: themeConfig.surface, color: themeConfig.textSecondary }}
                                  >
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                      month: 'short', day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {active && (
                              <span className="text-[10px] shrink-0" style={{ color: themeConfig.textSecondary }}>
                                Press <span className="font-semibold" style={{ color: themeConfig.text }}>Enter</span>
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(content, portalHost);
}

/* -------- Change Password Modal (JS) -------- */
function ChangePasswordModal({ open, onClose }) {
  const { themeConfig } = useTheme();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setShowOld(false); setShowNew(false); setShowConfirm(false);
      setSubmitting(false);
    }
  }, [open]);

  const validate = () => {
    if (!oldPwd) return "Please enter your current password.";
    if (!newPwd) return "Please enter a new password.";
    if (newPwd.length < 8) return "New password must be at least 8 characters.";
    const strong =
      /[a-z]/.test(newPwd) &&
      /[a-z]/.test(newPwd) &&
      /\d/.test(newPwd) &&
      /[^A-Za-z0-9]/.test(newPwd);
    /[^A-Za-z0-9]/.test(newPwd);
    if (!strong) return "New password must include character, number, and special character.";
    if (newPwd === oldPwd) return "New password must be different from the old password.";
    if (newPwd !== confirmPwd) return "New password and confirm password do not match.";
    return null;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const err = validate();
    if (err) { ErrorHandling({ defaultError: err }); return; }

    setSubmitting(true);
    try {
      const payload = { old_password: oldPwd, new_password: newPwd };
      const { data } = await axiosInstance.post(
        "/users/change-password",
        payload,
        { baseURL: BASE_URL_full }
      );

      toast.success(data?.message || "Password changed successfully.");
      onClose?.();
    } catch (error) {
      const res = error?.response?.data;
      const apiMsg =
        (typeof res === "string" ? res : (res?.detail || res?.message)) ||
        error?.message;
      ErrorHandling({ defaultError: apiMsg || "Failed to change password." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
      />
      {/* modal card */}
      <div
        className="relative z-[1003] w-full max-w-md rounded-2xl"
        style={{
          backgroundColor: themeConfig.cardBackground,
          border: `1px solid ${themeConfig.border}`,
          color: themeConfig.text,
          boxShadow: `0 20px 40px ${hexToRgba(themeConfig.shadow || "#000", 0.25)}`
        }}
      >
        <div
          className="px-5 py-4 rounded-t-2xl flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${themeConfig.border}`,
            background: `linear-gradient(90deg, ${hexToRgba(themeConfig.primary, 0.08)}, ${hexToRgba(themeConfig.accent, 0.08)})`
          }}
        >
          <div className="flex items-center gap-2">
            <Lock size={18} style={{ color: themeConfig.primary }} />
            <h3 className="text-sm font-semibold" style={{ color: themeConfig.text }}>Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1"
            style={{ color: themeConfig.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Old password */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>Current password</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 rounded-xl"
                placeholder="Enter current password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                autoFocus
                style={{
                  backgroundColor: themeConfig.inputBackground,
                  color: themeConfig.text,
                  border: `1px solid ${themeConfig.inputBorder}`
                }}
              />
              <button
                type="button"
                onClick={() => setShowOld(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Toggle current password visibility"
                style={{ color: themeConfig.textSecondary }}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 rounded-xl"
                placeholder="Enter new password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                style={{
                  backgroundColor: themeConfig.inputBackground,
                  color: themeConfig.text,
                  border: `1px solid ${themeConfig.inputBorder}`
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Toggle new password visibility"
                style={{ color: themeConfig.textSecondary }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: themeConfig.textSecondary }}>
              Must include upper, lower, number & special character; min 8 chars.
            </p>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 rounded-xl"
                placeholder="Re-enter new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                style={{
                  backgroundColor: themeConfig.inputBackground,
                  color: themeConfig.text,
                  border: `1px solid ${themeConfig.inputBorder}`
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                aria-label="Toggle confirm password visibility"
                style={{ color: themeConfig.textSecondary }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl transition"
              style={{
                border: `1px solid ${themeConfig.border}`,
                color: themeConfig.text,
                backgroundColor: "transparent"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 h-10 rounded-xl text-white disabled:opacity-60 flex items-center gap-2"
              style={{
                backgroundColor: themeConfig.primary,
                boxShadow: `0 8px 18px ${hexToRgba(themeConfig.primary, 0.25)}`
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primaryHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primary; }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
