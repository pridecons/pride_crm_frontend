"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Search, Plus, Send, MoreVertical } from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";

/* =========================================================
   Utilities
========================================================= */
const clsx = (...x) => x.filter(Boolean).join(" ");
const toLocal = (iso) => { try { return new Date(iso); } catch { return new Date(); } };
const isSameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

/** Get "HH:MM" if <24h; weekday if <7d; else dd/mm */
function humanTime(iso) {
  if (!iso) return "";
  const d = toLocal(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604_800_000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function useEmployeeCode() {
  const [code, setCode] = useState(null);
  useEffect(() => {
    try {
      const ui = Cookies.get("user_info");
      if (ui) {
        const obj = JSON.parse(ui);
        if (obj?.employee_code) { setCode(obj.employee_code); return; }
        if (obj?.sub) { setCode(obj.sub); return; }
      }
      const tok = Cookies.get("access_token");
      if (tok) {
        const p = jwtDecode(tok);
        setCode(p?.sub || p?.employee_code || null);
      }
    } catch {}
  }, []);
  return code;
}

/* =========================================================
   WebSocket Hook
========================================================= */
function makeWsUrl(httpBase, threadId, token) {
  // prefer axios baseURL if available
  let base = httpBase || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = `/api/v1/ws/chat/${threadId}`;
    if (token) u.searchParams.set("token", token); // adjust param name if your backend expects different
    return u.toString();
  } catch {
    return `/api/v1/ws/chat/${threadId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }
}


function useChatSocket({ threadId, onEvent, enabled = true }) {
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);
  const timers = useRef({ reconnect: null, heartbeat: null });
  const attemptsRef = useRef(0);

  const clearTimers = () => {
    if (timers.current.heartbeat) clearInterval(timers.current.heartbeat);
    if (timers.current.reconnect) clearTimeout(timers.current.reconnect);
    timers.current.heartbeat = null;
    timers.current.reconnect = null;
  };

  const closeSocket = () => {
    try { wsRef.current?.close(1000, "navigate"); } catch {}
    wsRef.current = null;
    setReady(false);
    clearTimers();
  };

  useEffect(() => {
    if (!enabled || !threadId) { closeSocket(); return; }

    const token = Cookies.get("access_token");
    const httpBase = axiosInstance?.defaults?.baseURL;
    const url = makeWsUrl(httpBase, threadId, token);

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setReady(true);
          attemptsRef.current = 0;
          clearTimers();

          // JOIN / SUBSCRIBE the current thread so server starts emitting room events
          try {
            ws.send(JSON.stringify({ type: "join", thread_id: threadId }));
          } catch {}

          // heartbeat ping every 25s
          timers.current.heartbeat = setInterval(() => {
            try { ws.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          // Accept multiple shapes: string, {type, data}, {event, payload}, raw message
          let payload = null;
          try { payload = JSON.parse(ev.data); } catch { payload = ev.data; }

          // Normalize common server variants
          if (payload && typeof payload === "object") {
            if (payload.type && payload.data) {
              onEvent?.(payload);                     // {type, data}
            } else if (payload.event && payload.payload) {
              onEvent?.({ type: payload.event, data: payload.payload });
            } else if (payload.message) {
              onEvent?.({ type: "message", data: payload.message });
            } else {
              // maybe it is already the message itself
              onEvent?.({ type: "message", data: payload });
            }
          } else {
            onEvent?.({ type: "message_text", data: String(payload || "") });
          }
        };

        ws.onclose = () => {
          setReady(false);
          clearTimers();
          const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
        };

        ws.onerror = () => { try { ws.close(); } catch {} };
      } catch {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
      }
    };

    connect();
    return () => { closeSocket(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, enabled]);

  const sendJson = useCallback((obj) => {
    try {
      if (ready && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(obj));
        return true;
      }
    } catch {}
    return false;
  }, [ready]);

  return { ready, sendJson };
}

/* =========================================================
   UI Atoms
========================================================= */
function Avatar({ name, id, size = "sm" }) {
  const label = (name || id || "?").trim();
  const letters = label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "U";
  const sizeClasses = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div className={`flex ${sizeClasses} items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium`}>
      {letters}
    </div>
  );
}

function DayDivider({ date }) {
  const label = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  return (
    <div className="flex justify-center my-4">
      <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">{label}</span>
    </div>
  );
}

function MessageBubble({ mine, msg, showHeader, showAvatar }) {
  const dt = toLocal(msg.created_at);
  return (
    <div className={clsx("flex gap-2 mb-2", mine ? "flex-row-reverse" : "flex-row")}>
      {!mine && showAvatar ? <Avatar name={msg.sender_id} id={msg.sender_id} /> : !mine ? <div className="w-8" /> : null}
      <div className={clsx("max-w-xs lg:max-w-md", mine ? "items-end" : "items-start")}>
        {showHeader && !mine && <div className="text-xs text-gray-600 mb-1 px-1">{msg.sender_id}</div>}
        <div
          className={clsx(
            "px-3 py-2 rounded-2xl shadow-sm break-words",
            mine ? "bg-green-500 text-white rounded-br-md" : "bg-white border rounded-bl-md"
          )}
        >
          <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
          <div className={clsx("text-xs mt-1 text-right", mine ? "text-green-100" : "text-gray-500")}>
            {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   User Select (autocomplete) & New Chat Modal
========================================================= */
function UserSelect({ users, value, onChange, placeholder, multiple = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const name = (u.full_name || u.name || "").toLowerCase();
        const code = (u.employee_code || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 12);
  }, [users, query]);

  const displayValue = multiple
    ? (Array.isArray(value) && value.length > 0 ? `${value.length} selected` : "")
    : value ? `${value.full_name || value.name} (${value.employee_code})` : query;

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); if (!multiple) onChange(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((user) => (
            <button
              key={user.employee_code}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
              onClick={() => {
                if (multiple) {
                  const exists = value.find((v) => v.employee_code === user.employee_code);
                  if (!exists) onChange([...value, user]);
                } else {
                  onChange(user);
                  setQuery("");
                }
                setOpen(false);
              }}
            >
              <div className="font-medium">{user.full_name || user.name || user.employee_code}</div>
              <div className="text-xs text-gray-500">
                {user.employee_code}{user.branch_name ? ` • ${user.branch_name}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChatModal({ isOpen, onClose, users, onCreateDirect, onCreateGroup }) {
  const [tab, setTab] = useState("direct");
  const [directUser, setDirectUser] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);

  const handleCreateDirect = () => {
    if (!directUser) return;
    onCreateDirect(directUser);
    setDirectUser(null);
    onClose();
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || groupUsers.length === 0) return;
    onCreateGroup(groupName.trim(), groupUsers);
    setGroupName("");
    setGroupUsers([]);
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Chat</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
          </div>
          <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
            <button
              className={clsx("flex-1 py-2 text-sm rounded-md", tab === "direct" ? "bg-white shadow-sm" : "")}
              onClick={() => setTab("direct")}
            >
              Direct Chat
            </button>
            <button
              className={clsx("flex-1 py-2 text-sm rounded-md", tab === "group" ? "bg-white shadow-sm" : "")}
              onClick={() => setTab("group")}
            >
              Group Chat
            </button>
          </div>
        </div>

        <div className="p-4">
          {tab === "direct" ? (
            <div className="space-y-4">
              <UserSelect users={users} value={directUser} onChange={setDirectUser} placeholder="Search for a user..." />
              <button
                onClick={handleCreateDirect}
                disabled={!directUser}
                className="w-full py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <div>
                <label className="block text-sm text-gray-600 mb-2">Add participants</label>
                <UserSelect users={users} value={groupUsers} onChange={setGroupUsers} placeholder="Search users..." multiple />
                {groupUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupUsers.map((u) => (
                      <span key={u.employee_code} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs">
                        {u.full_name || u.name || u.employee_code}
                        <button
                          onClick={() => setGroupUsers(groupUsers.filter((x) => x.employee_code !== u.employee_code))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || groupUsers.length === 0}
                className="w-full py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main Page
========================================================= */
export default function WhatsAppChatPage() {
  const currentUser = useEmployeeCode();

  // Core data
  const [threads, setThreads] = useState([]); // [{id, type, name, branch_id, unread_count?, last_message?, last_message_time?}]
  const [selected, setSelected] = useState(null);
  const selectedId = selected?.id ?? null;
  const [messages, setMessages] = useState([]);

  // Directory
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  // UI state
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Load users & branches once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/users/", { params: { skip: 0, limit: 200, active_only: true } });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const normalized = list.map((u) => ({
          employee_code: u.employee_code || u.code || u.id || "",
          full_name: u.full_name || u.name || u.username || "",
          branch_name: u.branch?.name || u.branch_name || "",
          ...u,
        }));
        if (alive) setUsers(normalized);
      } catch (e) { console.error("users load error", e); }

      try {
        const { data: bdata } = await axiosInstance.get("/branches/");
        const blist = Array.isArray(bdata?.data) ? bdata.data : Array.isArray(bdata) ? bdata : [];
        if (alive) setBranches(blist);
      } catch (e) { console.error("branches load error", e); }
    })();
    return () => { alive = false; };
  }, []);

  // Poll threads (and fill last message if not present)
  useEffect(() => {
    let alive = true;
    const loadThreads = async () => {
      try {
        const { data } = await axiosInstance.get("/chat/threads");
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        setThreads((prev) => {
          const prevMap = new Map(prev.map((t) => [t.id, t]));
          return arr.map((t) => ({ ...prevMap.get(t.id), ...t }));
        });

        // Best-effort fill last message/time for top threads lacking it
        arr.slice(0, 20).forEach(async (t) => {
          const ex = threads.find((x) => x.id === t.id);
          if (ex?.last_message_time) return;
          try {
            const { data: last } = await axiosInstance.get(`/chat/${t.id}/messages`, { params: { limit: 1 } });
            if (Array.isArray(last) && last.length) {
              const m = last[last.length - 1];
              setThreads((prev) =>
                prev.map((x) => (x.id === t.id ? { ...x, last_message: m.body, last_message_time: m.created_at } : x))
              );
            }
          } catch {}
        });
      } catch (e) {
        console.error("threads load error", e);
      }
    };
    loadThreads();
    const t = setInterval(loadThreads, 8000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when selecting a thread
  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/chat/${selected.id}/messages`, { params: { limit: 100 } });
        const list = Array.isArray(data) ? data : [];
        setMessages(list);

        if (list.length) {
          const lastId = list[list.length - 1].id;
          // Mark read (HTTP fallback; also done via WS in a bit)
          axiosInstance.post(`/chat/${selected.id}/mark-read`, null, { params: { last_message_id: lastId } }).catch(() => {});
        }
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      } catch (e) {
        console.error("messages load error", e);
      }
    })();
  }, [selected?.id]);
  // Immediately clear local unread for this thread
useEffect(() => {
  if (!selectedId) return;
  setThreads((prev) => prev.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t)));
}, [selectedId]);

  // Rendered messages with day grouping and header collapsing
  const renderedMessages = useMemo(() => {
    const result = [];
    let lastDay = null;
    let lastSender = null;
    (messages || []).forEach((msg) => {
      const date = toLocal(msg.created_at);
      if (!lastDay || !isSameDay(date, lastDay)) {
        result.push({ type: "DAY", key: `day-${date.toDateString()}`, date });
        lastDay = date; lastSender = null;
      }
      const mine = msg.sender_id === currentUser;
      const showHeader = lastSender !== msg.sender_id;
      const showAvatar = !mine && showHeader;
      result.push({ type: "MSG", key: `msg-${msg.id}`, mine, showHeader, showAvatar, msg });
      lastSender = msg.sender_id;
    });
    return result;
  }, [messages, currentUser]);

  // WebSocket: handle server events
const handleSocketEvent = useCallback((evt) => {
  if (!evt) return;

  // Accept both {type:"message", data:{...}} and direct message payloads
  const raw = evt.data ?? evt.message ?? evt;
  if (evt.type === "message" || raw?.thread_id) {
    const m = raw;
    const tId = m.thread_id;

    if (tId === selectedId) {
      // append to open chat
      setMessages((prev) => {
        // de-dupe by id if server echoes same message
        if (prev.length && m.id && prev.some(x => x.id === m.id)) return prev;
        return [...prev, m];
      });

      // update left list
      setThreads((prev) =>
        prev.map((t) => (t.id === tId ? { ...t, last_message: m.body, last_message_time: m.created_at } : t))
      );

      // mark read immediately (optimistic)
      setThreads((prev) => prev.map((t) => (t.id === tId ? { ...t, unread_count: 0 } : t)));

      // best-effort server mark-read
      if (m.id) {
        axiosInstance.post(`/chat/${tId}/mark-read`, null, { params: { last_message_id: m.id } }).catch(() => {});
      }

      // scroll to bottom
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
    } else {
      // update list & unread for other threads
      setThreads((prev) =>
        prev.map((t) =>
          t.id === tId
            ? {
                ...t,
                last_message: m.body,
                last_message_time: m.created_at,
                unread_count: (t.unread_count || 0) + 1,
              }
            : t
        )
      );
    }
    return;
  }

  if (evt.type === "message_text" && typeof evt.data === "string" && selectedId) {
    const nowIso = new Date().toISOString();
    setMessages((prev) => [...prev, { id: Date.now(), thread_id: selectedId, sender_id: "SYSTEM", body: evt.data, created_at: nowIso }]);
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
  }
}, [selectedId]);

  // Boot WS for current thread
  const { ready: wsReady, sendJson: wsSend } = useChatSocket({
    threadId: selected?.id,
    enabled: !!selected?.id,
    onEvent: handleSocketEvent,
  });

  // Prefer WS to send; fall back to HTTP
  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    const body = text.trim();
    setText("");

    // Try WS first
    const sent = wsSend({ type: "send", data: { thread_id: selectedId, body } });

    if (sent) {
      // Optimistic append (remove if your server echoes immediately and you want no dup risk)
      const local = {
        id: Date.now(),
        thread_id: selected.id,
        sender_id: currentUser,
        body,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, local]);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selected.id ? { ...t, last_message: body, last_message_time: local.created_at } : t
        )
      );
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      return;
    }

    // HTTP fallback
    try {
      const { data } = await axiosInstance.post(`/chat/${selected.id}/send`, { body });
      setMessages((prev) => [...prev, data]);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selected.id ? { ...t, last_message: body, last_message_time: data.created_at } : t
        )
      );
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      console.error("send error", e);
    }
  };

  // Create direct / group
  const handleCreateDirect = async (user) => {
    try {
      const { data: t } = await axiosInstance.post("/chat/direct/create", { peer_employee_code: user.employee_code });
      setThreads((prev) => (prev.find((x) => x.id === t.id) ? prev : [t, ...prev]));
      setSelected(t);
      const { data: msgs } = await axiosInstance.get(`/chat/${t.id}/messages`, { params: { limit: 100 } });
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (e) {
      console.error("create direct error", e);
    }
  };

  const handleCreateGroup = async (name, usersArr) => {
    try {
      const participant_codes = usersArr.map((u) => u.employee_code);
      const { data: t } = await axiosInstance.post("/chat/group/create", { name, participant_codes });
      setThreads((prev) => [t, ...prev]);
      setSelected(t);
      setMessages([]);
    } catch (e) {
      console.error("create group error", e);
    }
  };

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    return threads.filter((t) => (t.name || "Direct Chat").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [threads, searchQuery]);

  const getThreadName = (thread) => (thread.type === "GROUP" ? (thread.name || `Group #${thread.id}`) : "Direct Chat");

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Chats</h1>
            <button onClick={() => setShowNewChat(true)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full" title="New chat">
              <Plus size={20} />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:bg-white focus:shadow-sm"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setSelected(thread)}
              className={clsx(
                "flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer",
                selected?.id === thread.id && "bg-green-50"
              )}
            >
              <Avatar name={getThreadName(thread)} id={String(thread.id)} size="lg" />
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm truncate">{getThreadName(thread)}</h3>
                  <span className="text-xs text-gray-500 ml-2">{humanTime(thread.last_message_time)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600 truncate">{thread.last_message || " "}</p>
                  {!!thread.unread_count && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <Avatar name={getThreadName(selected)} id={String(selected.id)} size="lg" />
                <div className="ml-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    {getThreadName(selected)}
                    <span className={clsx("text-[11px] px-2 py-0.5 rounded-full",
                      wsReady ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {wsReady ? "Live" : "Offline"}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selected.type === "GROUP" ? "Group" : "Online"}
                  </p>
                </div>
              </div>
              {selected.type === "GROUP" && (
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Group options">
                  <MoreVertical size={20} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-1">
                {renderedMessages.map((it) =>
                  it.type === "DAY" ? (
                    <DayDivider key={it.key} date={it.date} />
                  ) : (
                    <MessageBubble
                      key={it.key}
                      mine={it.mine}
                      msg={it.msg}
                      showHeader={it.showHeader}
                      showAvatar={it.showAvatar}
                    />
                  )
                )}
                <div ref={scrollRef} />
              </div>
            </div>

            {/* Composer */}
            <div className="bg-white p-4 border-t">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:border-green-500 max-h-32"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || !selected}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={wsReady ? "Send (WS)" : "Send (HTTP fallback)"}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Welcome to Chat</h3>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        onCreateDirect={handleCreateDirect}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
