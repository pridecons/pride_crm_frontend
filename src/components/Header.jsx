'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { Bell, X, Menu, Search, User, LogOut, Settings, Clock } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import { axiosInstance } from '@/api/Axios'
import toast from 'react-hot-toast'

export default function Header({ onMenuClick, onSearch }) {
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);

  // ---- Global Search state ----
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const searchWrapRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null); // AbortController for fetch cancel

  // ---- Quick Filter (Responses) state ----
  const [respOptions, setRespOptions] = useState([]); // [{id,name,aliases?:[]}]
  const [respMatches, setRespMatches] = useState([]); // suggestions for responses

  // ---- Clock ----
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isConnect, setIsConnect] = useState(false);

  // counts for current query: { [responseId]: number }
const [respCounts, setRespCounts] = useState({});

// Build a summary list [{id, name, count}] sorted by count desc (limit to 8 for brevity)
const respSummary = useMemo(() => {
  return (respOptions || [])
    .map(r => ({ id: r.id, name: r.name, count: respCounts[r.id] || 0 }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name))
    .slice(0, 8); // change/remove limit if you want all
}, [respOptions, respCounts]);


  const respMap = useMemo(() => {
    const m = {};
    for (const r of respOptions || []) {
      if (r && (r.id !== undefined) && r.name) m[r.id] = r.name;
    }
    return m;
  }, [respOptions]);


  // fetch response names once
  useEffect(() => {
    (async () => {
      try {
        // Adjust if your config path differs:
        const { data } = await axiosInstance.get('/lead-config/responses/');
        // expect: [{id: 1, name: "NPC", ...}, ...]
        setRespOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed loading response options', e);
      }
    })();
  }, []);

  const buildResponseMatches = (q) => {
    if (!q || q.trim().length < 2) return [];
    const term = q.trim().toLowerCase();

    // Simple prefix/contains match on response name + a few common aliases
    const aliasMap = {
      'npc': ['not picked', 'not picked call', 'no pickup'],
      'cb': ['call back', 'callback'],
      'int': ['interested'],
      'ni': ['not interested'],
    };

    return respOptions
      .filter(r => {
        const name = (r.name || '').toLowerCase();
        const aliases = aliasMap[name] || [];
        return name.startsWith(term) || name.includes(term) || aliases.some(a => a.startsWith(term));
      })
      .slice(0, 5) // top few
      .map(r => ({ id: r.id, name: r.name }));
  };

  // close profile on outside click
  const profileRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // clock
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

  // auth bootstrap
  useEffect(() => {
    const accessToken = Cookies.get('access_token');
    const userInfo = Cookies.get('user_info');
    if (accessToken && userInfo) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      const decoded = jwtDecode(accessToken);
      setUser({
        ...JSON.parse(userInfo),
        role: decoded.role,
      });
    }
  }, []);

  // expose query to parent (existing behavior)
  useEffect(() => {
    const id = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(query);
      if (typeof window !== 'undefined') sessionStorage.setItem('globalSearchQuery', query);
    }, 500);
    return () => clearTimeout(id);
  }, [query, onSearch]);

// ---- Fetch suggestions (debounced) ----
const fetchSuggestions = useCallback(async (q) => {
  const term = (q || "").trim();

  // short queries → clear everything
  if (term.length < 2) {
    try { abortRef.current?.abort(); } catch {}
    setSuggestions([]);
    setRespCounts({});
    setRespMatches([]);
    setOpen(false);
    setLoading(false);
    return;
  }

  // cancel previous request
  try { abortRef.current?.abort(); } catch {}
  const ac = new AbortController();
  abortRef.current = ac;

  setLoading(true);
  try {
    const url = `/leads/search/?q=${encodeURIComponent(term)}&search_type=all`;
    const { data } = await axiosInstance.get(url, {
      signal: ac.signal,
      baseURL: 'https://crm.24x7techelp.com/api/v1',
    });

    // Normalize to an array of leads
    const list =
      Array.isArray(data)
        ? data
        : (data?.items || data?.results || data?.leads || []);

    // 1) build counts by responseId
    const counts = {};
    for (const l of list) {
      let rid = l?.lead_response_id ?? null;

      // fallback: map by response name → id
      if (rid == null && l?.lead_response_name) {
        const match = (respOptions || []).find(
          r => (r.name || '').toLowerCase() === String(l.lead_response_name || '').toLowerCase()
        );
        if (match) rid = match.id;
      }
      if (rid != null) counts[rid] = (counts[rid] || 0) + 1;
    }
    setRespCounts(counts);

    // 2) set lead suggestions (limit)
    setSuggestions(list.slice(0, 8));

    // 3) optional: response quick matches for the typed term
    setRespMatches(buildResponseMatches(term));

    setOpen(true);
  } catch (err) {
    if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
      console.error(err);
    }
    // still try to show response-name matches even if fetch fails
    setSuggestions([]);
    setRespCounts({});
    setRespMatches(buildResponseMatches(term));
    setOpen(!!buildResponseMatches(term).length);
  } finally {
    setLoading(false);
  }
}, [respOptions]);   

  // debounce input → suggestions
  useEffect(() => {
    const id = setTimeout(() => {
      fetchSuggestions(query);
    }, 250);
    return () => clearTimeout(id);
  }, [query, fetchSuggestions]);

  // ---- Handlers ----
  const handleSelect = (lead) => {
    setOpen(false);
    setHighlight(-1);
    setQuery(lead?.full_name || '');
    // Navigate to lead details (adjust route if different in your app)
    router.push(`/dashboard/leads/${lead.id}`);
  };

  const handleEnterNoPick = () => {
    setOpen(false);
    setHighlight(-1);
    // If parent wants a full search, keep using existing prop:
    if (typeof onSearch === 'function') onSearch(query);
    // Or navigate to a results page you own:
    // router.push(`/dashboard/leads?query=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min((h ?? -1) + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max((h ?? -1) - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && suggestions.length && highlight >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlight]);
      } else {
        handleEnterNoPick();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const handleResponseFilterClick = (respName) => {
    setOpen(false);
    setHighlight(-1);
    // navigate to the dedicated results page with kind=response
    router.push(`/search?kind=response&value=${encodeURIComponent(respName)}`);
  };

  const toggleProfileMenu = () => setShowProfileMenu((p) => !p);

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
            <img
              src="/pride.png"
              alt="Logo"
              width={130}
              height={55}
              className="transition-transform duration-200 hover:scale-105"
            />
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 -z-10" />
          </div>
        </div>

        {/* -------- Global Search -------- */}
        <div className="flex-1 max-w-md mx-3 hidden sm:block" ref={searchWrapRef}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search lead by name, phone, or email…"
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white shadow-sm hover:shadow-md"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onKeyDown={onKeyDown}
              onFocus={() => { if (suggestions.length) setOpen(true); }}
              autoComplete="off"
            />
            {/* clear */}
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); setHighlight(-1); inputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}

            {/* Suggestions dropdown */}
            {open && (loading || suggestions.length > 0 || respSummary.length > 0) && (
              <div className="absolute mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden z-50">
                {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}

                {/* Responses (counts) */}
{!loading && respSummary.length > 0 && (
  <div className="border-b border-gray-100">
    <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 bg-gray-50">
      Responses
    </div>
    <ul className="max-h-64 overflow-auto">
      {respSummary.map((r) => (
        <li
          key={`resp-sum-${r.id}`}
          onClick={() => handleResponseFilterClick(r.name)}
          className="cursor-pointer px-3 py-2 text-sm flex items-center justify-between hover:bg-blue-50"
          title={`Open results for ${r.name}`}
        >
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-xs">response</span>
            <span className="font-medium text-gray-900">{r.name}</span>
          </div>
          <span className="text-xs text-gray-600">{r.count}</span>
        </li>
      ))}
    </ul>
  </div>
)}

                {/* Lead hits */}
                {!loading && suggestions.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 bg-gray-50">Leads</div>
                    <ul className="max-h-80 overflow-auto">
                      {suggestions.map((l, idx) => {
                        const active = idx === highlight;
                        return (
                          <li
                            key={l.id}
                            onMouseEnter={() => setHighlight(idx)}
                            onMouseLeave={() => setHighlight(-1)}
                            onClick={() => handleSelect(l)}
                            className={`cursor-pointer px-3 py-2 text-sm flex items-start gap-3 ${active ? 'bg-blue-50' : 'bg-white'} hover:bg-blue-50`}
                          >
                            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-center font-semibold">
                              {String(l.full_name || '?').trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{l.full_name}</div>
                              <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                                {l.mobile && <span className="px-1.5 py-0.5 bg-gray-100 rounded-md">{l.mobile}</span>}
                                {(l.lead_response_name || respMap[l.lead_response_id]) && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700">
                                    {l.lead_response_name || respMap[l.lead_response_id]}
                                  </span>
                                )}
                                {l.is_client ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md">Client</span>
                                  : <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-md">Lead</span>}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {!loading && suggestions.length === 0 && respMatches.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                )}

                <div className="px-3 py-2 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between">
                  <span>↑/↓ to navigate • Enter to open</span>
                  <span>Esc to close</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* -------- /Global Search -------- */}

        {/* Right cluster */}
        <div className="flex items-center gap-6">
          <ShowNotifications setIsConnect={setIsConnect} />

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
                <p className="text-xs text-gray-500">{user?.role || "Role"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

/* ---------------- Notifications (unchanged) ---------------- */
const ShowNotifications = ({ setIsConnect }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const retryCountRef = useRef(0);
  const socketRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(`wss://crm.24x7techelp.com/api/v1/ws/notification/Admin001`);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnect(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!["connection_confirmed", "ping", "pong"].includes(data.type)) {
          const messageWithTime = { ...data, received_at: new Date() };
          setMessages((prev) => [...prev, messageWithTime]);

          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
                <div className="bg-blue-100 rounded-full p-2">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-sm font-medium text-gray-900">{data?.title}</p>
                  <p className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: data.message }} />
                  <p className="text-[10px] text-right text-gray-400 mt-1">
                    {(() => {
                      const date = new Date(messageWithTime.received_at);
                      let hours = date.getHours();
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12 || 12;
                      return `${hours}:${minutes} ${ampm}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          ));
        }
      };

      socket.onclose = () => {
        setIsConnect(false);
        if (retryCountRef.current < 10) {
          retryCountRef.current += 1;
          setTimeout(connect, 1000);
        }
      };
    };

    connect();
    return () => { socketRef.current?.close(); };
  }, [setIsConnect]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
      >
        <Bell size={20} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow animate-bounce">
            {messages.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200 animate-in slide-in-from-top-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{messages?.length}</span>
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])} className="text-xs text-blue-600 hover:underline hover:text-blue-800">
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto space-y-3">
            {messages?.map((val, index) => (
              <div key={index} className="relative flex items-start space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 max-w-full">
                <div className="bg-blue-100 rounded-full p-2">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900">{val?.title}</p>
                  <p className="text-xs text-gray-500 break-words whitespace-normal w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: val.message }} />
                  {val?.received_at && (
                    <p className="text-[10px] text-right text-gray-400 mt-1">
                      {new Date(val.received_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const updated = [...messages];
                    updated.splice(index, 1);
                    setMessages(updated);
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
