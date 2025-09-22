'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Bell, X, Menu, Search, User, Clock, ChevronDown, Eye, EyeOff, Lock, Loader2, LogOut, MessageCircle } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { axiosInstance, BASE_URL_full } from '@/api/Axios';
import toast from 'react-hot-toast';
import { createPortal } from "react-dom";
import { usePermissions } from "@/context/PermissionsContext";
import ShowNotifications from "./Notofication/ShowNotifications";
import { doLogout } from "@/utils/logout";
import { ErrorHandling } from "@/helper/ErrorHandling";

/** ---------- helpers ---------- */

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

const CHAT_UNREAD_VIA_HTTP = false; // ⬅️ OFF = never call /chat/threads automatically

function toPrettyRole(r = '') {
  const clean = String(r || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
  if (!clean) return '';
  return clean
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Safely extract name & role from cookie ONLY (no JWT, no prettifying) */
function getUserFromCookies() {
  try {
    const raw = Cookies.get('user_info');
    const parsed = raw ? JSON.parse(raw) : {};

    // direct values from cookie payloads we’ve seen in your app
    const name =
      parsed?.name ??
      parsed?.user?.name ??
      parsed?.user_info?.name ??
      'User';

    // ← show exactly what cookie has (e.g., "BA")
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
      role_label,       // <- use this in UI
      employee_code,
    };
  } catch {
    return null;
  }
}

export default function Header({ onMenuClick, onSearch, sidebarOpen }) {
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

  // ---- Chat unread bubble ----
  const [chatUnread, setChatUnread] = useState(0);
  const fetchChatUnread = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/chat/threads', { baseURL: BASE_URL_full });
      const arr = Array.isArray(data) ? data : [];
      const total = arr.reduce((sum, t) => {
        // try multiple possible keys
        const v =
          t?.unread_count ??
          t?.unread ??
          t?.unseen_count ??
          t?.unreadMessages ??
          t?.unread_for_me ??
          0;
        return sum + Number(v || 0);
      }, 0);
      setChatUnread(total);
    } catch {
      // ignore; next tick will retry
    }
  }, []);


  /** ✅ auth bootstrap: set axios auth + extract user for header */
  useEffect(() => {
    // ensure auth header before first call
    const token = Cookies.get('access_token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // ⬅️ initialize header user (reads cookie and/or JWT)
    const u = getUserFromCookies();
    if (u) setUser(u);

    if (!CHAT_UNREAD_VIA_HTTP) return;   // nothing below runs when false
    fetchChatUnread();
    const id = setInterval(fetchChatUnread, 8000);
    return () => clearInterval(id);
  }, [fetchChatUnread]);

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
      console.error('Failed loading lookups', e);
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

  // Put near other helpers (top of file)
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

  /** ✅ auth bootstrap: set axios auth + extract user for header */
  useEffect(() => {
    // ensure auth header before first call
    const token = Cookies.get('access_token');
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    if (!CHAT_UNREAD_VIA_HTTP) return;   // ⬅️ stop here
    fetchChatUnread();
    const id = setInterval(fetchChatUnread, 8000);
    return () => clearInterval(id);
  }, [fetchChatUnread]);


  useEffect(() => {
    const id = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(query);
      if (typeof window !== 'undefined') sessionStorage.setItem('globalSearchQuery', query);
    }, 500);
    return () => clearTimeout(id);
  }, [query, onSearch]);

  function getResponseName(lead, respMapLocal = null) {
    const map = respMapLocal ?? respMap;
    return (
      lead?.lead_response_name ||
      lead?.lead_response?.name ||
      (lead?.lead_response_id != null ? map?.[lead.lead_response_id] : "") ||
      "No Response"
    );
  }

  const fetchSuggestions = useCallback(async (q) => {
    const term = (q || "").trim();
    // clear on short term
    if (term.length < 2) {
      try { abortRef.current?.abort(); } catch { }
      setSuggestions([]); setRespCounts({}); setRespMatches([]); setResponseCounts({}); setLoading(false);
      return;
    }

    // cancel previous
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

      // Prefer explicit arrays from API shape
      const assignedRaw =
        Array.isArray(data?.leads)
          ? data.leads
          : (Array.isArray(data) ? data : (data?.items || data?.results || []));
      const activateRaw = Array.isArray(data?.activate_leads) ? data.activate_leads : [];

      // keep this inside fetchSuggestions so it can close over `user`
      const normalize = (l, assigned = false) => {
        const response_id =
          l?.lead_response_id ??
          l?.response_id ??
          l?.lead_response?.id ?? null;

        const response_name =
          l?.lead_response_name ??
          l?.response_name ??
          l?.lead_response?.name ?? "";

       // --- NEW: prefer the structured object; keep fallbacks for older shapes
        const au = l?.assigned_user || null;
        const assigned_code =
          au?.employee_code ??
          l?.assigned_to_user ??
          l?.assigned_to ??
          l?.assigned_user_code ??
          "";
        const assigned_name =
          au?.name ??
          l?.assigned_to_user_name ??
          l?.assigned_user_name ??
          (typeof l?.assigned_to === "string" ? l.assigned_to : undefined) ??
          (assigned ? (user?.name ?? "You") : "");
        const assigned_role =
          au?.role ??
          l?.assigned_to_user_role ??
          l?.assigned_user_role ??
          "";

        // Am I the assignee?
        const isMine =
          (assigned_code && user?.employee_code && assigned_code === user.employee_code) ||
          (assigned && !!l?.id); // keep old behavior as fallback

        return {
          id: l?.id ?? l?.lead_id ?? l?._id,
          full_name:
            l?.full_name ?? l?.name ?? [l?.first_name, l?.last_name].filter(Boolean).join(" "),
          mobile: l?.mobile ?? l?.phone ?? l?.contact_no ?? "",
          email: l?.email ?? l?.mail ?? "",
          lead_response_id: response_id,
          lead_response_name: response_name,
          source_id: l?.source_id ?? l?.lead_source_id ?? null,
          source_name: l?.source_name ?? l?.lead_source_name ?? "",
          branch_id: l?.branch_id ?? null,
          assigned_to_name: assigned_name,
          assigned_to_code: assigned_code,
          assigned_to_role: assigned_role,
          assigned_user: au || undefined,
          is_masked: !!l?.is_masked,
          __assigned: !!isMine,
          __clickable: !!assigned && !!(l?.id ?? l?.lead_id ?? l?._id),
          created_at: l?.created_at ?? null,
          response_changed_at: l?.response_changed_at ?? null,
        };
      };

      const normalizeActivate = (l) =>
        normalize(
          {
            ...l,
            id:
              l?.id ??
              l?.lead_id ??
              l?._id ??
              `act:${l?.mobile || l?.email || Math.random().toString(36).slice(2)}`,
          },
    /* assigned */ false
        );

      const assigned = (assignedRaw || []).map((x) => normalize(x, true)).filter(x => x?.id != null);
      const others = (activateRaw || []).map(normalizeActivate);

      const list = [...assigned, ...others].slice(0, 50);
      // Build counts
      const countsById = {};
      const countsByName = {};
      for (const l of list) {
        // prefer id; fallback by name if needed
        if (l.lead_response_id != null) {
          countsById[l.lead_response_id] = (countsById[l.lead_response_id] || 0) + 1;
        }
        const rname = l.lead_response_name || (respMap?.[l.lead_response_id] ?? "No Response");
        countsByName[rname] = (countsByName[rname] || 0) + 1;
      }

      setRespCounts(countsById);
      setResponseCounts(countsByName);
      setSuggestions(list.slice(0, 50));
      setRespMatches(buildResponseMatches(term, respOptions));
    } catch (err) {
      // Swallow cancels; only log real errors
      const canceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (!canceled) console.error("search error", err);
      setSuggestions([]); setRespCounts({}); setResponseCounts({});
      setRespMatches(buildResponseMatches(term, respOptions));
    } finally {
      setLoading(false);
    }
  }, [respOptions, respMap, user]);

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
    if (lead?.__assigned && lead?.id) {
      router.push(`/lead/${lead.id}`);
    } else {
      toast?.error("This lead isn't assigned to you.");
    }
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
    <header className="fixed top-0 left-0 right-0 z-50 h-16 shadow-lg">
      {/* solid white header like CoreUI; subtle divider */}
      <div className="h-full bg-white border-b border-gray-200">
        <div className="h-full px-4 lg:px-4 flex items-center justify-between relative">
          {/* Left cluster: menu + (mobile-only) logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger — toggles mobile sidebar */}
            {/* Show the hamburger on ALL sizes so desktop can collapse too */}
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition duration-150"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>

            {/* Show the logo in the header ONLY when the sidebar is closed on mobile.
     On desktop (lg+), the logo stays in the sidebar, so we hide it here. */}
            {/* Show header logo whenever the sidebar is CLOSED (any breakpoint) */}
            <div className="relative">
              <img
                src="/pride_logo_nobg.png"
                alt="Logo"
                width={130}
                height={55}
                className="transition-transform duration-200 hover:scale-105"
                onClick={() => router.push("/dashboard")}
              />
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 -z-10" />
            </div>
          </div>

          {/* -------- Global Search -------- */}
          {hasPermission("header_global_search") && (
            <div
              className={`flex-1 ${searchWidthCls} mx-3 hidden sm:block transition-all duration-200`}
              ref={searchWrapRef}
            >
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search lead by name, phone, or email…"
                  className={`w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl transition bg-gray-50
                      outline-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none
                      hover:shadow-md ${open ? 'invisible pointer-events-none' :
                      'focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white'}`}
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
                      inputRef.current?.blur();
                    });
                  }}
                  autoComplete="off"
                />
                {query && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); setHighlight(-1); inputRef.current?.focus(); }}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
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
          <div className="flex items-center gap-1">
            <ShowNotifications setIsConnect={setIsConnect} employee_code={user?.employee_code} />

            {/* Chat icon with unread bubble */}
            {hasPermission("chat_page") && <button
              type="button"
              onClick={() => router.push('/chatting')}
              className="group relative pr-2 rounded-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
              aria-label="Open chat"
              title="Chat"
            >
              <MessageCircle size={18} className="transition-transform group-hover:scale-105" />
              {chatUnread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center z-10"
                >
                  {chatUnread > 99 ? '99+' : chatUnread}
                </span>
              )}
            </button>}

            {/* Clock */}
            <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-5 py-1 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 rounded-full p-1">
                  <Clock size={14} className="text-blue-600" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{currentTime}</div>
                  <div className="text-xs text-gray-500">{currentDate}</div>
                </div>
              </div>
            </div>

            {/* Profile (md+) */}
            <div className="relative hidden md:block" ref={profileRef}>
              <button
                type="button"
                onClick={toggleProfileMenu}
                className="flex items-center space-x-2 px-1.5 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <User size={18} className="text-white" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${isConnect ? "bg-green-500" : "bg-red-500"} rounded-full border-2 border-white`} />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-500">{user?.role_label || "Role"}</p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-42 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Lock size={16} /> Change password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                    {/* (Optional) more items like 'View Profile', 'Logout' can go here */}
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

/* ---------------- SearchOverlay (unchanged except props pass-through) ---------------- */
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
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const overlayInputRef = useRef(null);

  useEffect(() => {
    overlayInputRef.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalCount = Object.values(responseCounts).reduce((a, b) => a + b, 0) || 0;

  const content = (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div
        ref={overlayRef}
        className="absolute z-[1001] pointer-events-auto rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
        style={{ top: anchorRect.top, left: anchorRect.left, width: anchorRect.width }}
      >
        {/* Top search bar */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
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
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:outline-none focus:ring-0 focus:shadow-none focus:border-gray-300 focus:bg-white text-[15px]"
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 bg-white border-b border-gray-100">
          <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveResponse('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition
              ${activeResponse === 'ALL'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
              All <span className="ml-2 text-[10px] opacity-80">{totalCount}</span>
            </button>

            {responseTabs.map(([name, count]) => (
              <button
                key={`tab-${name}`}
                onClick={() => setActiveResponse(name)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition
                ${activeResponse === name
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                title={`Filter: ${name}`}
              >
                {name}
                <span className={`ml-2 text-[10px] ${activeResponse === name ? 'opacity-90' : 'opacity-70'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="p-6 text-sm text-gray-500">Searching…</div>
          )}

          {/* Empty state */}
          {!loading && visibleLeads.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              No matching leads. Press <span className="font-semibold">Enter</span> to run a full search.
            </div>
          )}

          {/* Grouped by Response */}
          {!loading && groupedByResponse.map(([groupName, items]) => {
            const open = !!openGroups[groupName];
            return (
              <div key={`grp-${groupName}`} className="border-b border-gray-100">
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => setOpenGroups(prev => ({ ...prev, [groupName]: !open }))}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                  title={`Toggle ${groupName}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md border border-gray-300">
                      {open ? '−' : '+'}
                    </span>
                    <span className="text-xs font-semibold text-gray-800">{groupName}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">{items.length}</span>
                </button>

                {/* Group items */}
                {open && (
                  <ul className="divide-y divide-gray-100">
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
                          className={[
                            "px-3 py-2 transition",
                            lead.__assigned ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                            active ? "bg-blue-50" : "hover:bg-gray-50"
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Left: title + contact */}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {title}
                                {phone ? <span className="ml-2 text-gray-500 font-normal">• {phone}</span> : null}
                                {email ? <span className="ml-2 text-gray-400 font-normal truncate">• {email}</span> : null}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                                <span className="px-1.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                                  {rName}
                                </span>
                                {showBranch && (
  <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
    Branch: {bName}
  </span>
)}
                                <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                                  Source: {sName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700">
                                  Assigned: {aName}
                                  {aCode ? ` (${aCode})` : ''}
                                  {aRole ? ` • ${aRole}` : ''}
                                </span>
                                {lead.response_changed_at && (
                                  <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                                    Resp @ {new Date(lead.response_changed_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {lead.created_at && (
                                  <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                                    {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                      month: 'short', day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: “Enter” hint on active row */}
                            {active && (
                              <span className="text-[10px] text-gray-500 shrink-0">
                                Press <span className="font-semibold">Enter</span>
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

function ChangePasswordModal({ open, onClose }) {
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
    // At least 1 char, 1 number, 1 special
    const strong =
      /[a-z]/.test(newPwd) &&
      /[a-z]/.test(newPwd) &&
      /\d/.test(newPwd) &&
      /[^A-Za-z0-9]/.test(newPwd);
    if (!strong) return "New password must include character, number, and special character.";
    if (newPwd === oldPwd) return "New password must be different from the old password.";
    if (newPwd !== confirmPwd) return "New password and confirm password do not match.";
    return null;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const err = validate();
    if (err) { toast.error(err); return; }

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
      ErrorHandling(error, toast);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* modal card */}
      <div className="relative z-[1003] w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Old password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Current password</label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 border rounded-xl bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter current password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowOld(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Toggle current password visibility"
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 border rounded-xl bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter new password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Toggle new password visibility"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Must include upper, lower, number & special character; min 8 chars.
            </p>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full h-11 px-3 pr-10 border rounded-xl bg-white text-gray-900 placeholder-gray-400"
                placeholder="Re-enter new password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
