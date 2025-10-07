"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Bell, X, BellOff, FileText, RefreshCcw, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance, WS_BASE_URL_full } from "@/api/Axios";
import { useRouter } from "next/navigation";
import { AppContextProvider } from "@/app/Main";

/* -------------------------- Config -------------------------- */
const TOAST_MIN_GAP_MS = 2000;
const MAX_ACTIVE_TOASTS = 3;
const MAX_MESSAGES_BUFFER = 200;

const MAX_WS_RETRIES = 10;         // max 10 retries
const RECONNECT_DELAY_MS = 30000;  // 30s gap between retries


const SOUND_PREF_KEY = "notifications_sound_enabled";
const AUDIO_URL = "/notification.mp3";

/* -------------------------- Helpers -------------------------- */
function isHttpLike(u = "") {
  return /^https?:\/\//i.test(u);
}
function isWsLike(u = "") {
  return /^wss?:\/\//i.test(u);
}
function httpBaseFromWsBase(wsBase = "") {
  if (/^wss:\/\//i.test(wsBase)) return wsBase.replace(/^wss:/i, "https:");
  if (/^ws:\/\//i.test(wsBase)) return wsBase.replace(/^ws:/i, "http:");
  return wsBase;
}
function buildWsUrl(base, path) {
  try {
    if (isWsLike(base)) {
      const u = new URL(base);
      return `${u.protocol}//${u.host}${path}`;
    }
    if (isHttpLike(base)) {
      const u = new URL(base);
      const scheme = u.protocol === "https:" ? "wss:" : "ws:";
      return `${scheme}//${u.host}${path}`;
    }
    const here = new URL(window.location.href);
    const scheme = here.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${here.host}${path}`;
  } catch {
    const isHttps = typeof location !== "undefined" && location.protocol === "https:";
    const scheme = isHttps ? "wss:" : "ws:";
    const host = typeof location !== "undefined" ? location.host : "";
    return `${scheme}//${host}${path}`;
  }
}
function buildHttpRoot(base) {
  try {
    if (isHttpLike(base)) {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    }
    if (isWsLike(base)) {
      const httpBase = httpBaseFromWsBase(base);
      const u = new URL(httpBase);
      return `${u.protocol}//${u.host}`;
    }
    const here = new URL(window.location.href);
    return `${here.protocol}//${here.host}`;
  } catch {
    const isHttps = typeof location !== "undefined" && location.protocol === "https:";
    const scheme = isHttps ? "https:" : "http:";
    const host = typeof location !== "undefined" ? location.host : "";
    return `${scheme}//${host}`;
  }
}

function formatDateTimeDDMMYYYY(dt) {
  try {
    const d = new Date(dt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");

    return `${dd}/${mm}/${yyyy} ${h}:${min}:${sec} ${ampm}`;
  } catch {
    return "";
  }
}

function formatTime(dateLike) {
  try {
    var date = new Date(dateLike);
    var hours = date.getHours();
    var minutes = String(date.getMinutes());
    if (minutes.length < 2) minutes = "0" + minutes;
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return String(hours) + ":" + String(minutes) + " " + ampm;
  } catch (e) {
    return "";
  }
}
/* ============================================================= */

export default function ShowNotifications({ setIsConnect, employee_code }) {
  const router = useRouter();
  const { setSaymentStatus } = useContext(AppContextProvider);

  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // WS “rational” push: keep the last one + an unread flag for the badge
  const [lastRational, setLastRational] = useState(null); // {id,timestamp,type,title,message}
  const [rationalUnread, setRationalUnread] = useState(false);

  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const allowReconnectRef = useRef(true);
  const socketRef = useRef(null);
  const wrapperRef = useRef(null);

  const audioRef = useRef(null);
  const userInteractedRef = useRef(false);

  const lastToastAtRef = useRef(0);
  const activeToastIdsRef = useRef([]);

  const showNotificationsRef = useRef(false);
  useEffect(() => {
    showNotificationsRef.current = showNotifications;
  }, [showNotifications]);

  // Fallback refs
  const sseRef = useRef(null);
  const pollTimerRef = useRef(null);
  const lastSeenServerTsRef = useRef(0); // server ts for pull delta

  /* ---------- Init sound pref + audio ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage?.getItem(SOUND_PREF_KEY);
      if (stored === "0") setSoundEnabled(false);
    } catch { }
    try {
      const el = new Audio(AUDIO_URL);
      el.preload = "auto";
      el.volume = 1.0;
      audioRef.current = el;
    } catch {
      audioRef.current = null;
    }

    function markInteraction() {
      userInteractedRef.current = true;
      const a = audioRef.current;
      if (a?.play) {
        try {
          const p = a.play();
          if (p?.then) {
            p.then(() => {
              a.pause();
              a.currentTime = 0;
            }).catch(() => { });
          }
        } catch { }
      }
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    }
    window.addEventListener("click", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("touchstart", markInteraction);
    return () => {
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0");
    } catch { }
  }, [soundEnabled]);

  function playSound() {
    if (!soundEnabled) return;
    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      const p = el.play?.();
      p?.catch(() => { });
    } catch { }
  }

  /* ---------------- message handler (WS/SSE/Poll reuse) ---------------- */
  function handleIncoming(obj) {
    if (!obj) return;
    const messageWithTime = {
      title: obj.title,
      message: obj.message,
      lead_id: obj.lead_id,
      type: obj.type,
      received_at: obj.ts ? new Date(obj.ts) : new Date(),
    };

    if (obj.ts) {
      const tsNum = typeof obj.ts === "number" ? obj.ts : Date.parse(obj.ts);
      if (!Number.isNaN(tsNum))
        lastSeenServerTsRef.current = Math.max(
          lastSeenServerTsRef.current,
          tsNum
        );
    }

    setMessages((prev) => {
      const next = prev ? prev.slice() : [];
      next.push(messageWithTime);
      if (next.length > MAX_MESSAGES_BUFFER)
        next.splice(0, next.length - MAX_MESSAGES_BUFFER);
      return next;
    });

    if (showNotificationsRef.current) return;

    const now = Date.now();
    if (now - lastToastAtRef.current < TOAST_MIN_GAP_MS) return;
    lastToastAtRef.current = now;

    playSound();

    if (activeToastIdsRef.current.length >= MAX_ACTIVE_TOASTS) {
      const oldId = activeToastIdsRef.current.shift();
      if (oldId) toast.dismiss(oldId);
    }

    const id = toast.custom(
      (t) => (
        <div
          className={
            (t?.visible ? "animate-enter" : "animate-leave") +
            " max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5"
          }
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
            <div className="bg-blue-100 rounded-full p-2">
              <Bell size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 w-full">
              <p className="text-sm font-medium text-gray-900">
                {obj.title || ""}
              </p>
              <p
                className="text-xs text-gray-500"
                dangerouslySetInnerHTML={{ __html: obj.message || "" }}
              />
              <p className="text-[10px] text-right text-gray-400 mt-1">
                {formatTime(messageWithTime.received_at)}
              </p>
            </div>
            {obj.lead_id ? (
              <button
                onClick={() => router.push("/lead/" + String(obj.lead_id))}
                className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                View
              </button>
            ) : null}
          </div>
        </div>
      ),
      { position: "bottom-right", duration: 1000 }
    );
    activeToastIdsRef.current.push(id);
  }

  /* ---------------- Fallbacks ---------------- */
  function stopSSE() {
    try {
      sseRef.current?.close?.();
    } catch { }
    sseRef.current = null;
  }
  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  /* ---------------- WebSocket connect (primary) ---------------- */
  useEffect(() => {
  if (!employee_code) return;
  if (typeof window === "undefined") return;

  function isSocketAlive(ws) {
    return (
      ws &&
      (ws.readyState === window.WebSocket.OPEN ||
        ws.readyState === window.WebSocket.CONNECTING)
    );
  }

  function connectWS() {
    if (typeof window.WebSocket === "undefined") return;
    if (isSocketAlive(socketRef.current)) return;

    // ✅ Use path-only; browser will use current origin (ws://host or wss://host)
    const path = `/api/v1/ws/notification/${String(employee_code)}`;
    const url = buildWsUrl(WS_BASE_URL_full, path);

    let socket;
    try {
      socket = new window.WebSocket(url);
    } catch {
      // if constructor itself fails, schedule retry
      scheduleReconnect();
      return;
    }

    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnect?.(true);
      retryCountRef.current = 0; // reset on successful open
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      stopSSE();
      stopPolling();
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data?.type === "connection_confirmed" || data?.type === "ping" || data?.type === "pong") {
        return;
      } else if (data?.type === "rational") {
        setLastRational({
          id: data.id || `ws-${Date.now()}`,
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type,
          title: data.title || "Recommendation",
          message: data.message || "",
        });
        setRationalUnread(true);
      } else {
        handleIncoming(data);
        if (data.order_id && data.payment_status) {
          setSaymentStatus({ order_id: data.order_id, payment_status: data.payment_status });
        }
      }
    };

    socket.onerror = () => {
      try { socket.close(); } catch {}
    };

    socket.onclose = () => {
      setIsConnect?.(false);
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (!allowReconnectRef.current) return;

    // increment first, then check cap (max 10 tries)
    retryCountRef.current += 1;
    if (retryCountRef.current > MAX_WS_RETRIES) return;

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(connectWS, RECONNECT_DELAY_MS);
  }

  connectWS();

  return () => {
    allowReconnectRef.current = false;
    try { socketRef.current?.close(); } catch {}
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopSSE();
    stopPolling();
    for (let i = 0; i < activeToastIdsRef.current.length; i++)
      toast.dismiss(activeToastIdsRef.current[i]);
    activeToastIdsRef.current = [];
    setTimeout(() => { allowReconnectRef.current = true; }, 0);
  };
}, [employee_code, setIsConnect]);


  /* ---------------- Click-outside to close panel ---------------- */
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target))
        setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Rationals modal control ---------------- */
  const [showRationalModal, setShowRationalModal] = useState(false);

  return (
    <div className="relative" ref={wrapperRef}>
      {/* notifications bell */}
      <button
        onClick={() => setShowNotifications((s) => !s)}
        className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
        title="Notifications"
      >
        <Bell size={20} />
        {messages?.length > 0 ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow animate-bounce">
            {messages.length}
          </span>
        ) : null}
      </button>

      {/* rationals button */}
      <button
        onClick={() => setShowRationalModal(true)}
        className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
        title="Rationals"
      >
        <FileText size={20} />
        {rationalUnread ? (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
            1
          </span>
        ) : null}
      </button>

      {/* Notifications dropdown */}
      {showNotifications ? (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transform transition-all duration-200 animate-in slide-in-from-top-2">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className={
                    "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition " +
                    (soundEnabled
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200")
                  }
                  title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
                >
                  {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  {soundEnabled ? "Sound On" : "Sound Off"}
                </button>

                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {messages ? messages.length : 0}
                </span>

                {messages?.length > 0 ? (
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-blue-600 hover:underline hover:text-blue-800"
                  >
                    Clear All
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto space-y-3">
            {messages?.length > 0 ? (
              messages.map((val, index) => {
                const title = val?.title || "Notification";
                const msgHtml = val?.message || "";
                const leadId = val?.lead_id || null;
                const ts = val?.received_at || null;

                return (
                  <div
                    key={(ts ? String(ts) : "msg") + "-" + String(index)}
                    className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-full bg-blue-50 p-2">
                        <Bell size={16} className="text-blue-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {title}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            {leadId ? (
                              <button
                                onClick={() => router.push("/lead/" + String(leadId))}
                                className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                                title="Open lead"
                              >
                                View
                              </button>
                            ) : null}

                            <button
                              onClick={() =>
                                setMessages((prev) => {
                                  const next = prev ? prev.slice() : [];
                                  next.splice(index, 1);
                                  return next;
                                })
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-50 transition"
                              title="Dismiss"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <p
                          className="mt-1 text-xs text-gray-600 break-words"
                          dangerouslySetInnerHTML={{ __html: msgHtml }}
                        />
                        {ts ? (
                          <p className="mt-1 text-[10px] text-gray-400 text-right">
                            {formatTime(ts)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white/60 p-6 text-center">
                  <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
                    <BellOff className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No notifications</p>
                  <p className="mt-1 text-xs text-gray-500">
                    You’re all caught up. New alerts will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Rationals modal */}
      <RationalModal
        open={showRationalModal}
        onClose={() => setShowRationalModal(false)}
        wsRational={lastRational}
        rationalUnread={rationalUnread}
        onSeenRational={() => setRationalUnread(false)}
      />
    </div>
  );
}

/* =============================================================
   Rational modal (fetches /recommendations and shows list)
   ============================================================= */

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function RationalModal({ open, onClose, wsRational, rationalUnread, onSeenRational }) {
  const wrapperRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [errorText, setErrorText] = useState("");

  // close on ESC
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (!open) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) onClose?.();
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  async function fetchData() {
    setLoading(true);
    setErrorText("");
    try {
      const res = await axiosInstance.get("/recommendations/?limit=100&offset=0");
      setList(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setErrorText("Failed to load rationals");
    } finally {
      setLoading(false);
    }
  }

  // fetch on open (and whenever a new ws rational arrives while open, we still refresh)
  useEffect(() => {
    if (open) fetchData();
  }, [open, wsRational]);

  // mark unread as seen when modal opens
  useEffect(() => {
    if (open && rationalUnread) onSeenRational?.();
  }, [open, rationalUnread, onSeenRational]);

  const root = buildHttpRoot(WS_BASE_URL_full);
  if (!open) return null;

  // synthesize a top “NEW” card from wsRational (still show even if it’s no longer unread)
  const wsItem = wsRational
    ? {
      id: "ws-" + (wsRational.id || wsRational.timestamp || Date.now()),
      stock_name: wsRational.title || "Recommendation",
      rational: wsRational.message || "",
      status: "NEW",
      recommendation_type: ["LIVE"],
      entry_price: null,
      stop_loss: null,
      targets: null,
      targets2: null,
      targets3: null,
      user_id: "system",
      created_at: wsRational.timestamp || new Date().toISOString(),
      pdf: null,
      __is_ws: true,
    }
    : null;

  const combinedList = wsItem ? [wsItem, ...list] : list;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        ref={wrapperRef}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Rationals</h3>
            <Badge tone="blue">{String(combinedList.length)}</Badge>
            {wsItem && rationalUnread ? <Badge tone="amber">NEW</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading…</div>
          ) : errorText ? (
            <div className="py-12 text-center text-sm text-red-600">{errorText}</div>
          ) : combinedList.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No rationals available.
            </div>
          ) : (
            <ul className="space-y-3">
              {combinedList.map((r) => {
                const types = Array.isArray(r?.recommendation_type) ? r.recommendation_type : [];
                const pdfEndpoint = `${root}/recommendations/${encodeURIComponent(String(r.id))}/pdf`;

                // tone by status
                const status = r?.status || "";
                let statusTone = "gray";
                if (String(status).toUpperCase().includes("TARGET")) statusTone = "green";
                else if (String(status).toUpperCase().includes("STOP")) statusTone = "red";
                else if (String(status).toUpperCase().includes("OPEN")) statusTone = "blue";
                if (r.__is_ws) statusTone = "amber";

                return (
                  <li
                    key={r.id}
                    className={
                      "relative border rounded-xl p-3 shadow-sm " +
                      (r.__is_ws ? "bg-amber-50 border-amber-200" : "bg-white")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* top row: name + type + OPEN + Entry  |  date (dd/mm/yyyy) */}
                        {/* top row: name + type + OPEN + Entry  |  date+time (dd/mm/yyyy hh:mm:ss AM/PM) */}
                        {/* top row: left content + absolute date/time on the right */}
                        <div className="flex items-center gap-2 pr-24">
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.stock_name || "—"}
                            </p>
                            {types.map((t, i) => (
                              <Badge key={i} tone="purple">{t}</Badge>
                            ))}
                            <Badge tone={statusTone}>{status || "—"}</Badge>

                            {/* Entry next to OPEN */}
                            {r?.entry_price != null && r?.entry_price !== "" ? (
                              <Badge tone="gray">Entry: {r.entry_price}</Badge>
                            ) : null}

                            {r.__is_ws ? <Badge tone="amber">NEW</Badge> : null}
                          </div>

                          {/* true top-right */}
                          <span className="absolute right-3 top-3 text-[11px] text-gray-500 whitespace-nowrap">
                            {r?.created_at ? formatDateTimeDDMMYYYY(r.created_at) : "—"}
                          </span>
                        </div>



                        {r.rational ? (
                          <div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">
                            {r.rational}
                          </div>
                        ) :
                          <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[12px] text-gray-600">

                            <p>
                              <span className="text-gray-500">T1:</span>{" "}
                              <span className="font-medium">{r.targets ?? "—"}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">T2:</span>{" "}
                              <span className="font-medium">{r.targets2 ?? "—"}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">T3:</span>{" "}
                              <span className="font-medium">{r.targets3 ?? "—"}</span>
                            </p>
                            <p>
                              <span className="text-gray-500">SL:</span>{" "}
                              <span className="font-medium">{r.stop_loss ?? "—"}</span>
                            </p>
                          </div>
                        }
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
