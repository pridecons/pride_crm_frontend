"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Search, Plus, Send, MoreVertical } from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";

/* =========================================================
   Utilities
========================================================= */
const clsx = (...x) => x.filter(Boolean).join(" ");
const toLocal = (iso) => {
  try {
    return new Date(iso);
  } catch {
    return new Date();
  }
};
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Get "HH:MM" if <24h; weekday if <7d; else dd/mm */
function humanTime(iso) {
  if (!iso) return "";
  const d = toLocal(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86_400_000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604_800_000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

// Accepts objects from HTTP or WS and normalizes keys/shapes
function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const body = raw.body ?? raw.text ?? raw.content ?? raw.message ?? "";

  const m = {
    id:
      raw.id ??
      raw.message_id ??
      raw.msgId ??
      `${raw.thread_id ?? raw.threadId ?? "T"}-${
        raw.sender_id ??
        raw.senderId ??
        raw.from ??
        raw.from_employee_code ??
        raw.user ??
        "U"
      }-${raw.timestamp ?? raw.time ?? Date.now()}`,
    thread_id:
      raw.thread_id ??
      raw.threadId ??
      raw.room_id ??
      raw.roomId ??
      raw.thread ??
      null,
    sender_id:
      raw.sender_id ??
      raw.senderId ??
      raw.from_employee_code ??
      raw.from ??
      raw.user ??
      "UNKNOWN",
    body,
    created_at:
      raw.created_at ??
      raw.createdAt ??
      raw.timestamp ??
      raw.time ??
      new Date().toISOString(),
    _type: raw.type ?? raw.event ?? undefined,
  };
  if (typeof m.created_at === "number") {
    m.created_at = new Date(m.created_at).toISOString();
  }
  return m;
}

// Some WS servers wrap messages in an envelope; unwrap consistently.
function unwrapWsEvent(data) {
  try {
    data = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    /* keep as string */
  }

  const mergeEnv = (env, payload) => {
    if (!payload || typeof payload !== "object") payload = {};
    if (env && typeof env === "object") {
      // bubble up common envelope fields
      if (env.senderId && payload.sender_id == null && payload.senderId == null)
        payload.senderId = env.senderId;
      if (env.createdAt && payload.created_at == null)
        payload.created_at = env.createdAt;
      if (env.timestamp && payload.timestamp == null)
        payload.timestamp = env.timestamp;
      if (env.time && payload.time == null) payload.time = env.time;
      if (env.id && payload.id == null) payload.id = env.id;
      if (env.type && payload.type == null) payload.type = env.type;
    }
    return payload;
  };

  if (data && typeof data === "object") {
    // common wraps
    if (data.data && (data.type || data.kind)) return mergeEnv(data, data.data);
    if (data.payload && (data.event || data.type))
      return mergeEnv(data, data.payload);
    if (data.message && typeof data.message === "object")
      return mergeEnv(data, data.message);
    // your server sends the final shape directly — just return it
    return data;
  }

  // plain text fallback
  return { body: String(data || ""), sender_id: "SYSTEM" };
}

function useEmployeeCode() {
  const [code, setCode] = useState(null);
  useEffect(() => {
    try {
      const ui = Cookies.get("user_info");
      if (ui) {
        const obj = JSON.parse(ui);
        if (obj?.employee_code) {
          setCode(obj.employee_code);
          return;
        }
        if (obj?.sub) {
          setCode(obj.sub);
          return;
        }
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

function makeWsUrl(httpBase, threadId, token) {
  // prefer axios baseURL if available
  let base =
    httpBase || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = `/api/v1/ws/chat/${threadId}`;
    if (token) u.searchParams.set("token", token); // adjust param name if your backend expects different
    return u.toString();
  } catch {
    return `/api/v1/ws/chat/${threadId}${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }`;
  }
}

function makeInboxWsUrl(httpBase, token) {
  let base =
    httpBase || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    // user-wide endpoint (no thread id)
    u.pathname = `/api/v1/ws/chat`;
    if (token) u.searchParams.set("token", token);
    return u.toString();
  } catch {
    return `/api/v1/ws/chat${
      token ? `?token=${encodeURIComponent(token)}` : ""
    }`;
  }
}

// Compare IDs; try numeric then lexicographic
function compareMsgId(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    if (na === nb) return 0;
    return na < nb ? -1 : 1;
  }
  return String(a).localeCompare(String(b));
}

/* =========================================================
   Sockets
========================================================= */
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
    try {
      wsRef.current?.close(1000, "navigate");
    } catch {}
    wsRef.current = null;
    setReady(false);
    clearTimers();
  };

  useEffect(() => {
    if (!enabled || !threadId) {
      closeSocket();
      return;
    }

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

          // Try multiple join formats for compatibility
          const room = String(threadId);
          const joinMsgs = [
            { type: "join", thread_id: room },
            { action: "join", thread_id: room },
            { event: "subscribe", payload: { thread_id: room } },
            { type: "subscribe", room_id: room },
          ];
          for (const j of joinMsgs) {
            try {
              ws.send(JSON.stringify(j));
            } catch {}
          }

          timers.current.heartbeat = setInterval(() => {
            try {
              ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
            } catch {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          const unwrapped = unwrapWsEvent(ev.data);

          const t = (unwrapped?.type || unwrapped?.event || "")
            .toString()
            .toLowerCase();

          // Allow typing/read events to bubble to parent if the thread matches
          if (t.includes("typing") || t.includes("read")) {
            onEvent?.({ type: t.includes("typing") ? "typing" : "read", data: unwrapped });
            return;
          }

          // if server uses type like "message.new", accept it; ignore non-message types
          if (t && !t.startsWith("message")) {
            onEvent?.({ type: "misc", data: unwrapped });
            return;
          }

          const norm = normalizeMessage(unwrapped);
          if (!norm || !norm.thread_id) {
            onEvent?.({ type: "misc", data: unwrapped });
            return;
          }
          onEvent?.({ type: "message", data: norm });
        };

        ws.onclose = () => {
          setReady(false);
          clearTimers();
          const attempt = (attemptsRef.current =
            (attemptsRef.current || 0) + 1);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
      }
    };

    connect();
    return () => {
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, enabled]);

  const sendJson = useCallback(
    (obj) => {
      try {
        if (ready && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(obj));
          return true;
        }
      } catch {}
      return false;
    },
    [ready]
  );

  return { ready, sendJson };
}

function useInboxSocket({
  currentUser,
  onEvent,
  enabled = true,
  onFallbackTick,
}) {
  const wsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const timers = useRef({ heartbeat: null, reconnect: null, poll: null });
  const attemptsRef = useRef(0);

  const clearTimers = () => {
    if (timers.current.heartbeat) clearInterval(timers.current.heartbeat);
    if (timers.current.reconnect) clearTimeout(timers.current.reconnect);
    if (timers.current.poll) clearInterval(timers.current.poll);
    timers.current.heartbeat = timers.current.reconnect = timers.current.poll = null;
  };

  useEffect(() => {
    if (!enabled || !currentUser) {
      try {
        wsRef.current?.close(1000, "inbox-off");
      } catch {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
      return;
    }

    const token = Cookies.get("access_token");
    const httpBase = axiosInstance?.defaults?.baseURL;
    const url = makeInboxWsUrl(httpBase, token);

    const startPollingFallback = () => {
      if (timers.current.poll) return;
      timers.current.poll = setInterval(() => {
        onFallbackTick?.();
      }, 2000);
    };

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setReady(true);
          attemptsRef.current = 0;
          clearTimers();

          // Try common “subscribe to all/my inbox” shapes
          const joinMsgs = [
            { type: "subscribe_user", user: String(currentUser) },
            { type: "join", scope: "user", user: String(currentUser) },
            { event: "subscribe", payload: { scope: "user", user: String(currentUser) } },
            { action: "subscribe_all" },
          ];
          for (const j of joinMsgs) {
            try {
              ws.send(JSON.stringify(j));
            } catch {}
          }

          timers.current.heartbeat = setInterval(() => {
            try {
              ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
            } catch {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          // accept message/typing/read-like events
          const unwrapped = unwrapWsEvent(ev.data);
          const t = (unwrapped?.type || unwrapped?.event || "")
            .toString()
            .toLowerCase();

          if (t.includes("read")) {
            onEvent?.({ kind: "read", data: unwrapped });
            return;
          }
          if (t.includes("typing")) {
            onEvent?.({ kind: "typing", data: unwrapped });
            return;
          }
          if (t.includes("message")) {
            const norm = normalizeMessage(unwrapped);
            if (norm && norm.thread_id) onEvent?.({ kind: "message", data: norm });
            return;
          }
          // ignore other events silently
        };

        ws.onclose = () => {
          setReady(false);
          clearTimers();
          // exponential backoff reconnect
          const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
          // while trying to reconnect, keep data somewhat fresh
          startPollingFallback();
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
        startPollingFallback();
      }
    };

    connect();
    return () => {
      try {
        wsRef.current?.close(1000, "inbox-unmount");
      } catch {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentUser]);

  return { inboxReady: ready };
}

/* =========================================================
   UI Atoms
========================================================= */
function Avatar({ name, id, size = "sm" }) {
  const label = (name || id || "?").trim();
  const letters =
    label
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "U";
  const sizeClasses = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div
      className={`flex ${sizeClasses} items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium`}
    >
      {letters}
    </div>
  );
}

function DayDivider({ date }) {
  const label = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  return (
    <div className="flex justify-center my-4">
      <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

function Tick({ state }) {
  // state: "sending" | "sent" | "delivered" | "read"
  if (state === "sending") {
    return (
      <svg viewBox="0 0 24 24" className="w-3 h-3 opacity-60">
        <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (state === "sent") {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 opacity-60">
        <path d="M4 13l4 4L20 5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (state === "delivered") {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-60">
        <path d="M3 13l4 4 6-8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 17l2 2 9-12" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  // read (blue)
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-sky-500">
      <path d="M3 13l4 4 6-8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 17l2 2 9-12" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MessageBubble({ mine, msg, showHeader, showAvatar }) {
  const created = msg.created_at ?? msg.createdAt ?? msg.timestamp ?? msg.time;
  const dt = toLocal(created);
  const timeStr = isNaN(dt.getTime())
    ? ""
    : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const state = msg._status || (mine ? "delivered" : undefined);

  return (
    <div className={clsx("flex mb-1", mine ? "justify-end" : "justify-start")}>
      {!mine && showAvatar ? (
        <div className="mr-2 mt-6">
          <Avatar name={msg.sender_id} id={msg.sender_id} />
        </div>
      ) : (
        !mine && <div className="w-8 mr-2" />
      )}

      <div className="max-w-[78%] relative group">
        {/* Tail */}
        <span
          className={clsx(
            "absolute top-0",
            mine
              ? "right-0 translate-x-2 border-8 border-transparent border-t-green-500"
              : "-left-1 -translate-x-2 border-8 border-transparent border-t-white"
          )}
          aria-hidden
        />
        {/* Bubble */}
        <div
          className={clsx(
            "px-3 py-2 rounded-2xl shadow-sm break-words whitespace-pre-wrap",
            mine
              ? "bg-green-500 text-white rounded-br-md"
              : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
          )}
        >
          {!mine && showHeader && (
            <div className="text-[11px] text-gray-500 mb-1">{msg.sender_id}</div>
          )}

          <div className="text-[15px] leading-5">{msg.body}</div>

          {/* Time + ticks row */}
          <div
            className={clsx(
              "mt-1 flex items-center gap-1",
              mine ? "justify-end text-green-100" : "justify-end text-gray-400"
            )}
          >
            <span className="text-[10px]">{timeStr}</span>
            {mine && <Tick state={state} />}
          </div>
        </div>

        {/* Hover actions */}
        <div className="absolute -top-3 opacity-0 group-hover:opacity-100 transition pointer-events-none right-0">
          <div className="flex gap-1 pointer-events-auto">
            <button className="text-[11px] px-2 py-0.5 bg-black/60 text-white rounded-full">
              Reply
            </button>
            <button
              className="text-[11px] px-2 py-0.5 bg-black/60 text-white rounded-full"
              onClick={() => navigator.clipboard?.writeText?.(msg.body || "")}
            >
              Copy
            </button>
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
    ? Array.isArray(value) && value.length > 0
      ? `${value.length} selected`
      : ""
    : value
    ? `${value.full_name || value.name} (${value.employee_code})`
    : query;

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!multiple) onChange(null);
        }}
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
                  const exists = value.find(
                    (v) => v.employee_code === user.employee_code
                  );
                  if (!exists) onChange([...value, user]);
                } else {
                  onChange(user);
                  setQuery("");
                }
                setOpen(false);
              }}
            >
              <div className="font-medium">
                {user.full_name || user.name || user.employee_code}
              </div>
              <div className="text-xs text-gray-500">
                {user.employee_code}
                {user.branch_name ? ` • ${user.branch_name}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewChatModal({
  isOpen,
  onClose,
  users,
  onCreateDirect,
  onCreateGroup,
}) {
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
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
            <button
              className={clsx(
                "flex-1 py-2 text-sm rounded-md",
                tab === "direct" ? "bg-white shadow-sm" : ""
              )}
              onClick={() => setTab("direct")}
            >
              Direct Chat
            </button>
            <button
              className={clsx(
                "flex-1 py-2 text-sm rounded-md",
                tab === "group" ? "bg-white shadow-sm" : ""
              )}
              onClick={() => setTab("group")}
            >
              Group Chat
            </button>
          </div>
        </div>

        <div className="p-4">
          {tab === "direct" ? (
            <div className="space-y-4">
              <UserSelect
                users={users}
                value={directUser}
                onChange={setDirectUser}
                placeholder="Search for a user..."
              />
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
                <label className="block text-sm text-gray-600 mb-2">
                  Add participants
                </label>
                <UserSelect
                  users={users}
                  value={groupUsers}
                  onChange={setGroupUsers}
                  placeholder="Search users..."
                  multiple
                />
                {groupUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupUsers.map((u) => (
                      <span
                        key={u.employee_code}
                        className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs"
                      >
                        {u.full_name || u.name || u.employee_code}
                        <button
                          onClick={() =>
                            setGroupUsers(
                              groupUsers.filter(
                                (x) => x.employee_code !== u.employee_code
                              )
                            )
                          }
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

  // Read receipts + typing
  const [readUpToByOthers, setReadUpToByOthers] = useState(() => new Map()); // threadId -> last_read_message_id
  const [typing, setTyping] = useState(false);

  // Unread divider + jump to latest
  const [firstUnreadIdx, setFirstUnreadIdx] = useState(null);
  const [showJump, setShowJump] = useState(false);

  // Refs
  const scrollRef = useRef(null); // bottom anchor
  const listRef = useRef(null); // messages scroller
  const textareaRef = useRef(null);

  // Background peeking throttle
  const peekCooldownMs = 10_000; // 10s
  const lastPeekAtRef = useRef(new Map()); // threadId -> last peek timestamp
  const inFlightRef = useRef(new Set()); // threadIds currently being peeked

  function msgKey(sender, threadId, body) {
    return `${sender || ""}|${threadId || ""}|${(body || "").slice(0, 500)}`;
  }

  const recentSentRef = useRef(new Set());
  const rememberSent = useCallback((sender, threadId, body, ttlMs = 5000) => {
    const k = msgKey(sender, threadId, body);
    recentSentRef.current.add(k);
    setTimeout(() => recentSentRef.current.delete(k), ttlMs);
  }, []);

  // Detect scrolled-up state to toggle FAB
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowJump(el.scrollTop + el.clientHeight < el.scrollHeight - 400);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Load users & branches once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 200, active_only: true },
        });
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        const normalized = list.map((u) => ({
          employee_code: u.employee_code || u.code || u.id || "",
          full_name: u.full_name || u.name || u.username || "",
          branch_name: u.branch?.name || u.branch_name || "",
          ...u,
        }));
        if (alive) setUsers(normalized);
      } catch (e) {
        console.error("users load error", e);
      }

      try {
        const { data: bdata } = await axiosInstance.get("/branches/");
        const blist = Array.isArray(bdata?.data)
          ? bdata.data
          : Array.isArray(bdata)
          ? bdata
          : [];
        if (alive) setBranches(blist);
      } catch (e) {
        console.error("branches load error", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Poll threads (and fill last message if not present)
  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      try {
        const { data } = await axiosInstance.get("/chat/threads");
        if (cancelled) return;

        const arr = Array.isArray(data) ? data : [];

        // Merge new snapshot with existing thread data (keeps unread_count, etc.)
        setThreads((prev) => {
          const prevMap = new Map(prev.map((t) => [t.id, t]));
          return arr.map((t) => ({ ...prevMap.get(t.id), ...t }));
        });

        // Throttled recents peek
        const now = Date.now();
        const toPeek = [];
        for (const t of arr) {
          if (!t?.id) continue;
          if (t.id === selectedId) continue;
          if (inFlightRef.current.has(t.id)) continue;
          const last = lastPeekAtRef.current.get(t.id) || 0;
          if (now - last < peekCooldownMs) continue;
          toPeek.push(t.id);
          if (toPeek.length >= 8) break;
        }

        toPeek.forEach(async (id) => {
          inFlightRef.current.add(id);
          lastPeekAtRef.current.set(id, Date.now());
          try {
            const { data: lastMsgs } = await axiosInstance.get(
              `/chat/${id}/messages`,
              { params: { limit: 1 } }
            );
            if (cancelled || !Array.isArray(lastMsgs) || !lastMsgs.length) return;

            const m = lastMsgs[lastMsgs.length - 1];
            setThreads((prev) =>
              prev.map((x) => {
                if (x.id !== id) return x;

                const prevTs = x.last_message_time
                  ? new Date(x.last_message_time).getTime()
                  : 0;
                const nextTs = m?.created_at ? new Date(m.created_at).getTime() : 0;

                const isNewer = nextTs > prevTs;
                const isSelf = String(m?.sender_id) === String(currentUser);
                const bump = isNewer && !isSelf && id !== selectedId ? 1 : 0;

                return {
                  ...x,
                  last_message: m.body,
                  last_message_time: m.created_at,
                  unread_count: (x.unread_count || 0) + bump,
                };
              })
            );
          } catch {
            /* ignore; will retry after cooldown */
          } finally {
            inFlightRef.current.delete(id);
          }
        });
      } catch (e) {
        console.error("threads load error", e);
      }
    };

    loadThreads();
    const iv = setInterval(loadThreads, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, currentUser]);

  const isPendingThread = (t) => !!t && !t.id && t.pending === true;

  // Load messages when selecting a thread
  useEffect(() => {
    if (!selected?.id) return;
    (async () => {
      try {
        const { data } = await axiosInstance.get(
          `/chat/${selected.id}/messages`,
          { params: { limit: 100 } }
        );
        const list = Array.isArray(data) ? data : [];
        setMessages(list);

        // compute unread divider if you have "last_read_message_id_self" on the thread
        const lastReadId = selected?.last_read_message_id_self;
        if (!lastReadId) {
          setFirstUnreadIdx(null);
        } else {
          const idx = list.findIndex((m) => compareMsgId(m.id, lastReadId) > 0);
          setFirstUnreadIdx(idx >= 0 ? idx : null);
        }

        if (list.length) {
          const lastId = list[list.length - 1].id;
          axiosInstance
            .post(`/chat/${selected.id}/mark-read`, null, {
              params: { last_message_id: lastId },
            })
            .catch(() => {});
        }
        setTimeout(
          () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
          80
        );
      } catch (e) {
        console.error("messages load error", e);
      }
    })();
  }, [selected?.id]);

  // Immediately clear local unread for this thread
  useEffect(() => {
    if (!selectedId) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t))
    );
  }, [selectedId]);

  // Handle inbox-wide events (message/typing/read)
  const handleInboxEvent = useCallback(
    (evt) => {
      if (!evt) return;

      // READ RECEIPT EVENT
      if (evt.kind === "read") {
        const tid =
          evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const lr = evt.data.last_read_id || evt.data.lastReadId || evt.data.last_read_message_id;
        if (tid && lr != null) {
          setReadUpToByOthers((prev) => {
            const m = new Map(prev);
            m.set(String(tid), lr);
            return m;
          });
          if (selected?.id === tid) {
            setMessages((prev) =>
              prev.map((mm) =>
                mm.sender_id === currentUser && compareMsgId(mm.id, lr) <= 0
                  ? { ...mm, _status: "read" }
                  : mm
              )
            );
          }
        }
        return;
      }

      // TYPING EVENT
      if (evt.kind === "typing") {
        const tid =
          evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const who = evt.data.user || evt.data.sender_id || evt.data.senderId;
        if (tid && tid === selected?.id && String(who) !== String(currentUser)) {
          setTyping(true);
          clearTimeout(window.__typingTimer);
          window.__typingTimer = setTimeout(() => setTyping(false), 2500);
        }
        return;
      }

      // MESSAGE EVENT
      if (evt.kind === "message" && evt.data) {
        const m = evt.data;
        const tId = m.thread_id;
        const isSelf = String(m.sender_id) === String(currentUser);

        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === tId);
          if (idx === -1) {
            // optimistic placeholder so the badge shows immediately
            const placeholder = {
              id: tId,
              name: m.thread_name || "Direct Chat",
              type: m.thread_type || "DIRECT",
              last_message: m.body,
              last_message_time: m.created_at,
              unread_count: isSelf || tId === selectedId ? 0 : 1,
            };
            return [placeholder, ...prev];
          }
          // update existing
          return prev.map((t) =>
            t.id === tId
              ? {
                  ...t,
                  last_message: m.body,
                  last_message_time: m.created_at,
                  unread_count:
                    isSelf || tId === selectedId
                      ? t.unread_count || 0
                      : (t.unread_count || 0) + 1,
                }
              : t
          );
        });

        // hydrate placeholder with real data in the background (non-blocking)
        (async () => {
          try {
            const { data: t } = await axiosInstance.get(`/chat/threads/${tId}`);
            if (!t?.id) return;
            setThreads((prev) =>
              prev.some((x) => x.id === tId)
                ? prev.map((x) => (x.id === tId ? { ...x, ...t } : x))
                : [t, ...prev]
            );
          } catch {}
        })();
      }
    },
    [currentUser, selected?.id, selectedId]
  );

  // Fallback short poll to keep the list fresh if inbox WS isn’t available
  const fallbackTick = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/chat/threads");
      const arr = Array.isArray(data) ? data : [];
      setThreads((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        const merged = arr.map((t) => ({ ...byId.get(t.id), ...t }));
        return merged;
      });
    } catch {}
  }, []);

  useInboxSocket({
    currentUser,
    enabled: !!currentUser,
    onEvent: handleInboxEvent,
    onFallbackTick: fallbackTick,
  });

  // Thread-specific socket (message + optional read/typing relayed)
  const handleSocketEvent = useCallback(
    (evt) => {
      if (!evt) return;

      // Thread-scoped read/typing
      if (evt.type === "read") {
        const tid =
          evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const lr = evt.data.last_read_id || evt.data.lastReadId || evt.data.last_read_message_id;
        if (tid && lr != null && tid === selected?.id) {
          setReadUpToByOthers((prev) => {
            const m = new Map(prev);
            m.set(String(tid), lr);
            return m;
          });
          setMessages((prev) =>
            prev.map((mm) =>
              mm.sender_id === currentUser && compareMsgId(mm.id, lr) <= 0
                ? { ...mm, _status: "read" }
                : mm
            )
          );
        }
        return;
      }
      if (evt.type === "typing") {
        const tid =
          evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const who = evt.data.user || evt.data.sender_id || evt.data.senderId;
        if (tid && tid === selected?.id && String(who) !== String(currentUser)) {
          setTyping(true);
          clearTimeout(window.__typingTimer);
          window.__typingTimer = setTimeout(() => setTyping(false), 2500);
        }
        return;
      }

      // Normal message flow
      if (evt.type === "message" && evt.data) {
        const m = normalizeMessage(evt.data);
        if (!m || !m.thread_id) return;

        const tId = m.thread_id;
        const isSelf = String(m.sender_id) === String(currentUser);

        // 1) Self-echo from server: never bump unread
        if (isSelf) {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === tId
                ? {
                    ...t,
                    last_message: m.body,
                    last_message_time: m.created_at,
                  }
                : t
            )
          );

          if (tId === selectedId) {
            setMessages((prev) => {
              if (m.id && prev.some((x) => x.id === m.id)) return prev;
              return [...prev, { ...m, _status: "delivered" }];
            });
            requestAnimationFrame(() =>
              scrollRef.current?.scrollIntoView({ behavior: "smooth" })
            );
          }
          return;
        }

        // 2) Messages from other users
        if (tId === selectedId) {
          setMessages((prev) => {
            if (m.id && prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          setThreads((prev) =>
            prev.map((t) =>
              t.id === tId
                ? {
                    ...t,
                    last_message: m.body,
                    last_message_time: m.created_at,
                    unread_count: 0,
                  }
                : t
            )
          );
          if (m.id) {
            axiosInstance
              .post(`/chat/${tId}/mark-read`, null, {
                params: { last_message_id: m.id },
              })
              .catch(() => {});
          }
          requestAnimationFrame(() =>
            scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          );
        } else {
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
      }
    },
    [selected?.id, selectedId, currentUser]
  );

  const { ready: wsReady } = useChatSocket({
    threadId: selected?.id,
    enabled: !!selected?.id,
    onEvent: handleSocketEvent,
  });

  // Always send via HTTP API. WS is only for receiving events.
  const handleSend = async () => {
    if (!text.trim() || !selected) return;
    const body = text.trim();
    setText("");

    // A) Pending direct chat → create thread THEN send (HTTP), then add to recents
    if (isPendingThread(selected)) {
      try {
        const peerCode = selected?.peer?.employee_code;
        rememberSent(currentUser, selected.id, body);

        // 1) Optimistic temp bubble
        const tempId = `tmp-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            thread_id: selected.id,
            sender_id: currentUser,
            body,
            created_at: new Date().toISOString(),
            _status: "sending",
          },
        ]);

        // 2) Create direct thread
        const { data: t } = await axiosInstance.post("/chat/direct/create", {
          peer_employee_code: peerCode,
        });

        // 3) Send message via HTTP
        const { data: sentMsg } = await axiosInstance.post(
          `/chat/${t.id}/send`,
          { body }
        );

        // Replace temp, update lists
        setThreads((prev) =>
          prev.find((x) => x.id === t.id) ? prev : [t, ...prev]
        );
        setSelected(t);
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempId)
            .concat([{ ...sentMsg, _status: "delivered" }])
        );
        setThreads((prev) =>
          prev.map((th) =>
            th.id === t.id
              ? {
                  ...th,
                  last_message: sentMsg.body,
                  last_message_time: sentMsg.created_at,
                }
              : th
          )
        );

        // Optional: mark-read for own-sent
        try {
          await axiosInstance.post(`/chat/${t.id}/mark-read`, null, {
            params: { last_message_id: sentMsg.id },
          });
        } catch {}

        setTimeout(
          () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
          50
        );
        return;
      } catch (e) {
        console.error("first send (create+send) error", e);
        return;
      }
    }

    // B) Normal existing thread → ALWAYS use HTTP API to send
    try {
      // temp optimistic
      const tempId = `tmp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          thread_id: selected.id,
          sender_id: currentUser,
          body,
          created_at: new Date().toISOString(),
          _status: "sending",
        },
      ]);

      const { data: sentMsg } = await axiosInstance.post(
        `/chat/${selected.id}/send`,
        { body }
      );

      // Replace temp with server message, set delivered
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...sentMsg, _status: "delivered" } : m
        )
      );

      // Update recents info
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                last_message: sentMsg.body,
                last_message_time: sentMsg.created_at,
              }
            : t
        )
      );

      // Mark as read (optional)
      try {
        await axiosInstance.post(`/chat/${selected.id}/mark-read`, null, {
          params: { last_message_id: sentMsg.id },
        });
      } catch {}

      setTimeout(
        () => scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } catch (e) {
      console.error("send error", e);
    }
  };

  // Rendered messages with day grouping and header collapsing + read state merge
  const renderedMessages = useMemo(() => {
    const result = [];
    let lastDay = null;
    let lastSender = null;
    (messages || []).forEach((msg) => {
      // derive _status if missing and it's mine
      if (msg.sender_id === currentUser) {
        if (!msg._status) {
          msg._status = String(msg.id).startsWith("tmp-")
            ? "sending"
            : "delivered";
        }
        const othersReadUpto = readUpToByOthers.get(String(msg.thread_id));
        if (othersReadUpto && compareMsgId(msg.id, othersReadUpto) <= 0) {
          msg._status = "read";
        }
      }

      const date = toLocal(msg.created_at);
      if (!lastDay || !isSameDay(date, lastDay)) {
        result.push({ type: "DAY", key: `day-${date.toDateString()}`, date });
        lastDay = date;
        lastSender = null;
      }
      const mine = msg.sender_id === currentUser;
      const showHeader = lastSender !== msg.sender_id;
      const showAvatar = !mine && showHeader;
      result.push({
        type: "MSG",
        key: `msg-${msg.id}`,
        mine,
        showHeader,
        showAvatar,
        msg,
      });
      lastSender = msg.sender_id;
    });
    return result;
  }, [messages, currentUser, readUpToByOthers]);

  const getThreadName = (thread) =>
    !!thread && !thread.id && thread.pending === true
      ? thread?.peer?.full_name || thread?.name || "New chat"
      : thread?.name || "Direct Chat";

  return (
    <div
      className="flex h-screen"
      style={{
        background: "linear-gradient(180deg,#eae6df 0%, #d1d7db 100%)",
      }}
    >
      {/* Sidebar */}
      {/* Sidebar */}
<div className="w-80 bg-white border-r flex flex-col">
  {/* Header */}
  <div className="p-4 bg-gray-50 border-b">
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">Chats</h1>
      <button
        onClick={() => setShowNewChat(true)} // now only for group chat
        className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
        title="New Group"
      >
        <Plus size={20} />
      </button>
    </div>
    {/* Search */}
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={16}
      />
      <input
        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:bg-white focus:shadow-sm"
        placeholder="Search chats or users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  </div>

  {/* Chat/User List */}
  <div className="flex-1 overflow-y-auto">
    {searchQuery.trim()
      ? (
        <>
          {/* Matching Threads */}
          {threads
            .filter((t) =>
              (t.name || "Direct Chat")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            )
            .map((thread) => (
              <div
                key={`thread-${thread.id}`}
                onClick={() => setSelected(thread)}
                className={clsx(
                  "flex items-center px-3 py-2 border-b hover:bg-gray-50 cursor-pointer",
                  selected?.id === thread.id && "bg-emerald-50"
                )}
              >
                <Avatar
                  name={getThreadName(thread)}
                  id={String(thread.id)}
                  size="lg"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[15px] truncate">
                      {getThreadName(thread)}
                    </h3>
                    <span className="text-[11px] text-gray-500 ml-2">
                      {humanTime(thread.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[13px] text-gray-600 truncate">
                      {thread.last_message || " "}
                    </p>
                    {!!thread.unread_count && (
                      <span className="ml-2 bg-emerald-500 text-white text-[11px] rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {/* Matching Users (for direct chat) */}
          {users
            .filter((u) =>
              (u.full_name || u.name || u.employee_code || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            )
            .map((user) => (
              <div
                key={`user-${user.employee_code}`}
                onClick={() =>
                  setSelected({
                    pending: true,
                    type: "DIRECT",
                    name: user.full_name || user.name || user.employee_code,
                    peer: {
                      employee_code: user.employee_code,
                      full_name:
                        user.full_name || user.name || user.employee_code,
                    },
                  })
                }
                className="flex items-center px-3 py-2 border-b hover:bg-gray-50 cursor-pointer"
              >
                <Avatar
                  name={user.full_name || user.name}
                  id={user.employee_code}
                  size="lg"
                />
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] truncate">
                    {user.full_name || user.name}
                  </h3>
                  <p className="text-[13px] text-gray-600 truncate">
                    {user.employee_code}
                  </p>
                </div>
              </div>
            ))}
        </>
      )
      : (
        /* Normal chat list (when search empty) */
        threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => setSelected(thread)}
            className={clsx(
              "flex items-center px-3 py-2 border-b hover:bg-gray-50 cursor-pointer",
              selected?.id === thread.id && "bg-emerald-50"
            )}
          >
            <Avatar
              name={getThreadName(thread)}
              id={String(thread.id)}
              size="lg"
            />
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[15px] truncate">
                  {getThreadName(thread)}
                </h3>
                <span className="text-[11px] text-gray-500 ml-2">
                  {humanTime(thread.last_message_time)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[13px] text-gray-600 truncate">
                  {thread.last_message || " "}
                </p>
                {!!thread.unread_count && (
                  <span className="ml-2 bg-emerald-500 text-white text-[11px] rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">
                    {thread.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
  </div>
</div>


      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="bg-white p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <Avatar
                  name={getThreadName(selected)}
                  id={String(selected.id)}
                  size="lg"
                />
                <div className="ml-3">
                  <h2 className="font-semibold flex items-center gap-2">
                    {getThreadName(selected)}
                    <span
                      className={clsx(
                        "text-[11px] px-2 py-0.5 rounded-full",
                        wsReady
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {wsReady ? "Live" : "Offline"}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600">
                    {typing
                      ? "typing…"
                      : selected.type === "GROUP"
                      ? "Group"
                      : "Online"}
                  </p>
                </div>
              </div>
              {selected.type === "GROUP" && (
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                  title="Group options"
                >
                  <MoreVertical size={20} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4"
              style={{
                backgroundImage:
                  "radial-gradient(#0000000a 1px, transparent 1px)",
                backgroundSize: "18px 18px",
                backgroundPosition: "-9px -9px",
              }}
            >
              <div className="space-y-1">
                {renderedMessages.map((it, i) => {
                  const node =
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
                    );

                  const isThisUnreadDivider =
                    firstUnreadIdx != null &&
                    it.type === "MSG" &&
                    renderedMessages.findIndex((x) => x.key === it.key) ===
                      firstUnreadIdx;

                  return isThisUnreadDivider ? (
                    <React.Fragment key={`wrap-${it.key}`}>
                      <div className="flex items-center my-3">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="mx-3 text-[11px] text-gray-600 bg-white px-2 py-0.5 rounded-full border">
                          Unread
                        </span>
                        <div className="flex-1 h-px bg-gray-300" />
                      </div>
                      {node}
                    </React.Fragment>
                  ) : (
                    node
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Jump to latest */}
              {showJump && (
                <button
                  onClick={() =>
                    listRef.current?.scrollTo({
                      top: listRef.current.scrollHeight,
                      behavior: "smooth",
                    })
                  }
                  className="absolute bottom-24 right-6 bg-white border shadow px-3 py-2 rounded-full text-sm"
                >
                  Jump to latest
                </button>
              )}
            </div>

            {/* Composer */}
            <div className="bg-white p-4 border-t">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative flex items-end gap-2">
                  <button
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Emoji"
                  >
                    😊
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Attach"
                  >
                    📎
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full resize-none focus:outline-none focus:border-green-500 max-h-32"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    className="p-2 rounded-full hover:bg-gray-100"
                    title="Voice"
                  >
                    🎤
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || !selected}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600">
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
        onCreateDirect={(user) => {
          setSelected({
            pending: true,
            type: "DIRECT",
            name: user.full_name || user.name || user.employee_code,
            peer: {
              employee_code: user.employee_code,
              full_name: user.full_name || user.name || user.employee_code,
            },
          });
          setMessages([]);
        }}
        onCreateGroup={async (name, usersArr) => {
          try {
            const participant_codes = usersArr.map((u) => u.employee_code);
            const { data: t } = await axiosInstance.post("/chat/group/create", {
              name,
              participant_codes,
            });
            setThreads((prev) => [t, ...prev]);
            setSelected(t);
            setMessages([]);
          } catch (e) {
            console.error("create group error", e);
          }
        }}
      />
    </div>
  );
}
