'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Bell, X, Menu, Search, User, Clock, ChevronDown } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { axiosInstance, BASE_URL_full } from '@/api/Axios';
import toast from 'react-hot-toast';
import { createPortal } from "react-dom";
import { usePermissions } from "@/context/PermissionsContext";
import ShowNotifications from "./Notofication/ShowNotifications";

/** ---------- helpers ---------- */
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

/** Safely extract name & role_name from cookie/JWT */
function getUserFromCookies() {
  try {
    const raw = Cookies.get('user_info');
    const accessToken = Cookies.get('access_token');
    const parsed = raw ? JSON.parse(raw) : {};

    // Name fallbacks
    const name =
      parsed?.name ||
      parsed?.user?.name ||
      parsed?.user_info?.name ||
      'User';

    // Role name fallbacks (prefer explicit role_name in cookie)
    let role_name =
      parsed?.role_name ||
      parsed?.user?.role_name ||
      parsed?.role ||                    // sometimes cookie stores "role" but it's already a label
      parsed?.user?.role ||
      '';

    // If still missing, peek into token (role/role_name)
    if (!role_name && accessToken) {
      const d = jwtDecode(accessToken);
      role_name = d?.role_name || d?.role || '';
    }

    const employee_code =
      parsed?.employee_code ||
      parsed?.user?.employee_code ||
      parsed?.user_info?.employee_code ||
      '';

    const rolePretty = toPrettyRole(role_name);

    return {
      ...parsed,
      name,
      role_name,          // canonical (e.g., SUPERADMIN / BRANCH_MANAGER)
      role_pretty: rolePretty, // pretty (e.g., Superadmin / Branch Manager)
      employee_code,
    };
  } catch {
    return null;
  }
}

export default function Header({ onMenuClick, onSearch }) {
  const { hasPermission } = usePermissions();
  const router = useRouter();
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
    const accessToken = Cookies.get('access_token');
    if (accessToken) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
    const u = getUserFromCookies();
    if (u) setUser(u);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(query);
      if (typeof window !== 'undefined') sessionStorage.setItem('globalSearchQuery', query);
    }, 500);
    return () => clearTimeout(id);
  }, [query, onSearch]);

  function getResponseName(lead, respMapLocal = null) {
    const map = respMapLocal ?? respMap;
    return lead?.lead_response_name || map?.[lead?.lead_response_id] || 'No Response';
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

      const raw = Array.isArray(data) ? data : (data?.items || data?.results || data?.leads || []);
      // Normalize to a consistent shape to avoid undefined fields killing the UI
      const normalize = (l) => ({
        id: l?.id ?? l?.lead_id ?? l?._id,
        full_name: l?.full_name ?? l?.name ?? [l?.first_name, l?.last_name].filter(Boolean).join(" "),
        mobile: l?.mobile ?? l?.phone ?? l?.contact_no ?? "",
        email: l?.email ?? l?.mail ?? "",
        lead_response_id: l?.lead_response_id ?? l?.response_id ?? null,
        lead_response_name: l?.lead_response_name ?? l?.response_name ?? l?.response ?? "",
        source_id: l?.source_id ?? l?.lead_source_id ?? null,
        source_name: l?.source_name ?? "",
        branch_id: l?.branch_id ?? null,
      });

      const list = (Array.isArray(raw) ? raw : []).map(normalize).filter(x => x?.id != null);

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
  }, [respOptions, respMap]);

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
    router.push(`/lead/${lead.id}`);
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
    <header className="bg-white border-b border-gray-100 px-4 py-2 lg:px-4 relative">
      <div className="absolute inset-0 pointer-events-none" />
      <div className="flex items-center justify-between relative z-10">
        {/* Logo + Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition duration-150"
          >
            <Menu size={20} />
          </button>
          <div className="relative">
            <img src="/pride.png" alt="Logo" width={130} height={55} className="transition-transform duration-200 hover:scale-105" />
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
                />
              )}
            </div>
          </div>
        )}
        {/* -------- /Global Search -------- */}

        {/* Right cluster */}
        <div className="flex items-center gap-6">
          <ShowNotifications setIsConnect={setIsConnect} employee_code={user?.employee_code} />

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
            <div className="flex items-center space-x-1.5 px-1 py-1 rounded-xl transition-all duration-200 group cursor-default">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User size={18} className="text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${isConnect ? "bg-green-500" : "bg-red-500"} rounded-full border-2 border-white`}></div>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500">{user?.role_pretty || "Role"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

/* ---------------- Notifications (unchanged) ---------------- */
// const ShowNotifications = ({ setIsConnect, employee_code }) => {
//   const [showNotifications, setShowNotifications] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const retryCountRef = useRef(0);
//   const socketRef = useRef(null);
//   const wrapperRef = useRef(null);

//   useEffect(() => {
//     if (!employee_code) return;
//     const connect = () => {
//       const socket = new WebSocket(`wss://crm.24x7techelp.com/api/v1/ws/notification/${employee_code}`);
//       socketRef.current = socket;

//       socket.onopen = () => { setIsConnect(true); retryCountRef.current = 0; };

//       socket.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         if (!["connection_confirmed", "ping", "pong"].includes(data.type)) {
//           const messageWithTime = { ...data, received_at: new Date() };
//           setMessages((prev) => [...prev, messageWithTime]);

//           toast.custom((t) => (
//             <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
//               <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
//                 <div className="bg-blue-100 rounded-full p-2">
//                   <Bell size={16} className="text-blue-600" />
//                 </div>
//                 <div className="flex-1 w-full">
//                   <p className="text-sm font-medium text-gray-900">{data?.title}</p>
//                   <p className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: data.message }} />
//                   <p className="text-[10px] text-right text-gray-400 mt-1">
//                     {(() => {
//                       const date = new Date(messageWithTime.received_at);
//                       let hours = date.getHours();
//                       const minutes = String(date.getMinutes()).padStart(2, '0');
//                       const ampm = hours >= 12 ? 'PM' : 'AM';
//                       hours = hours % 12 || 12;
//                       return `${hours}:${minutes} ${ampm}`;
//                     })()}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           ));
//         }
//       };

//       socket.onclose = () => {
//         setIsConnect(false);
//         if (retryCountRef.current < 10) {
//           retryCountRef.current += 1;
//           setTimeout(connect, 1000);
//         }
//       };
//     };

//     connect();
//     return () => { socketRef.current?.close(); };
//   }, [setIsConnect, employee_code]);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
//         setShowNotifications(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => { document.removeEventListener("mousedown", handleClickOutside); };
//   }, []);

//   return (
//     <div className="relative" ref={wrapperRef}>
//       <button
//         onClick={() => setShowNotifications(!showNotifications)}
//         className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
//       >
//         <Bell size={20} />
//         {messages.length > 0 && (
//           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow animate-bounce">
//             {messages.length}
//           </span>
//         )}
//       </button>

//       {showNotifications && (
//         <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200 animate-in slide-in-from-top-2">
//           <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100 rounded-t-2xl">
//             <div className="flex items-center justify-between">
//               <h3 className="font-semibold text-gray-900">Notifications</h3>
//               <div className="flex items-center space-x-2">
//                 <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{messages?.length}</span>
//                 {messages.length > 0 && (
//                   <button onClick={() => setMessages([])} className="text-xs text-blue-600 hover:underline hover:text-blue-800">
//                     Clear All
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//             {messages?.map((val, index) => (
//               <div key={index} className="relative flex items-start space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 max-w-full">
//                 <div className="bg-blue-100 rounded-full p-2">
//                   <Bell size={16} className="text-blue-600" />
//                 </div>
//                 <div className="flex-1 overflow-hidden">
//                   <p className="text-sm font-medium text-gray-900">{val?.title}</p>
//                   <p className="text-xs text-gray-500 break-words whitespace-normal w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: val.message }} />
//                   {val?.received_at && (
//                     <p className="text-[10px] text-right text-gray-400 mt-1">
//                       {new Date(val.received_at).toLocaleTimeString()}
//                     </p>
//                   )}
//                 </div>
//                 <button
//                   onClick={() => {
//                     const updated = [...messages];
//                     updated.splice(index, 1);
//                     setMessages(updated);
//                   }}
//                   className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
//                   title="Delete"
//                 >
//                   <X size={14} />
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

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
                    {items.map((lead) => {
                      const active = visibleLeads[highlight]?.id === lead.id;
                      const rName = lead.lead_response_name || respMap[lead.lead_response_id] || 'No Response';
                      const bName = branchMap[lead.branch_id] || lead.branch_name || '—';
                      const sName =
                        sourceMap[lead.source_id ?? lead.lead_source_id] ||
                        lead.source_name ||
                        lead.lead_source_name ||
                        '—';
                      const title = lead.full_name || lead.name || lead.client_name || 'Unnamed';
                      const phone = lead.phone || lead.mobile || lead.mobile_no || lead.contact_no || '';
                      const email = lead.email || lead.email_id || '';

                      return (
                        <li
                          key={lead.id}
                          onMouseEnter={() => {
                            const idx = visibleLeads.findIndex(v => v.id === lead.id);
                            if (idx >= 0) setHighlight(idx);
                          }}
                          onClick={() => handleSelect(lead)}
                          className={[
                            "px-3 py-2 cursor-pointer transition",
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
                                <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                                  Branch: {bName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full border border-gray-200 bg-gray-50">
                                  Source: {sName}
                                </span>
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
