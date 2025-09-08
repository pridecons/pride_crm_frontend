// "use client";

// import { useEffect, useRef, useState } from "react";
// import { Bell, X, BellOff } from "lucide-react";
// import toast from "react-hot-toast";
// import { WS_BASE_URL_full } from "@/api/Axios";
// import { useRouter } from "next/navigation";

// const TOAST_MIN_GAP_MS = 2000; // minimum time between toasts
// const MAX_ACTIVE_TOASTS = 3; // max toasts visible at once
// const MAX_MESSAGES_BUFFER = 200; // cap stored notifications
// const SOUND_PREF_KEY = "notifications_sound_enabled";

// export default function ShowNotifications({ setIsConnect, employee_code }) {
//   const router = useRouter();

//   const [showNotifications, setShowNotifications] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [soundEnabled, setSoundEnabled] = useState(true);

//   const retryCountRef = useRef(0);
//   const reconnectTimerRef = useRef(null);
//   const allowReconnectRef = useRef(true); // block reconnects during intentional teardown
//   const socketRef = useRef(null);
//   const wrapperRef = useRef(null);

//   const audioUrl = "/notification.mp3";
//   const audioRef = useRef(null);
//   const userInteractedRef = useRef(false);

//   const lastToastAtRef = useRef(0);
//   const activeToastIdsRef = useRef([]);

//   // keep a ref in sync so we can read the latest value inside WS handlers
//   const showNotificationsRef = useRef(false);
//   useEffect(() => {
//     showNotificationsRef.current = showNotifications;
//   }, [showNotifications]);

//   // Initialize sound preference & audio element
//   useEffect(() => {
//     if (typeof window === "undefined") return;

//     const stored = localStorage.getItem(SOUND_PREF_KEY);
//     if (stored === "0") setSoundEnabled(false);

//     const el = new Audio(audioUrl);
//     el.preload = "auto";
//     el.volume = 1.0;
//     audioRef.current = el;

//     const markInteraction = () => {
//       userInteractedRef.current = true;
//       if (audioRef.current) {
//         audioRef.current
//           .play()
//           .then(() => {
//             audioRef.current.pause();
//             audioRef.current.currentTime = 0;
//           })
//           .catch(() => {});
//       }
//       window.removeEventListener("click", markInteraction);
//       window.removeEventListener("keydown", markInteraction);
//       window.removeEventListener("touchstart", markInteraction);
//     };
//     window.addEventListener("click", markInteraction);
//     window.addEventListener("keydown", markInteraction);
//     window.addEventListener("touchstart", markInteraction);

//     return () => {
//       window.removeEventListener("click", markInteraction);
//       window.removeEventListener("keydown", markInteraction);
//       window.removeEventListener("touchstart", markInteraction);
//     };
//   }, []);

//   // Persist sound preference
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     localStorage.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0");
//   }, [soundEnabled]);

//   // Sound helper
//   const playSound = () => {
//     if (!soundEnabled) return;
//     const el = audioRef.current;
//     if (!el) return;
//     try {
//       el.pause();
//       el.currentTime = 0;
//       const p = el.play();
//       if (p && typeof p.then === "function") {
//         p.catch(() => {
//           // likely blocked until first interaction; the markInteraction handler warms it up
//         });
//       }
//     } catch (err) {
//       console.error("Failed to play notification sound:", err);
//     }
//   };

//   // WebSocket connect: only when employee_code changes or on first mount
//   useEffect(() => {
//     if (!employee_code) return;

//     const isSocketAlive = (ws) =>
//       ws &&
//       (ws.readyState === WebSocket.OPEN ||
//         ws.readyState === WebSocket.CONNECTING);

//     const connect = () => {
//       // Guard: if socket is already open or connecting, do not create a new one
//       if (isSocketAlive(socketRef.current)) return;

//       const socket = new WebSocket(
//         `${WS_BASE_URL_full}/ws/notification/${employee_code}`
//       );
//       socketRef.current = socket;

//       socket.onopen = () => {
//         setIsConnect?.(true);
//         retryCountRef.current = 0;
//         if (reconnectTimerRef.current) {
//           clearTimeout(reconnectTimerRef.current);
//           reconnectTimerRef.current = null;
//         }
//       };

//       socket.onmessage = (event) => {
//         let data;
//         try {
//           data = JSON.parse(event.data);
//         } catch {
//           return; // ignore malformed payloads
//         }

//         if (["connection_confirmed", "ping", "pong"].includes(data?.type))
//           return;

//         const messageWithTime = { ...data, received_at: new Date() };

//         // push to list (with buffer cap)
//         setMessages((prev) => {
//           const next = [...prev, messageWithTime];
//           if (next.length > MAX_MESSAGES_BUFFER)
//             next.splice(0, next.length - MAX_MESSAGES_BUFFER);
//           return next;
//         });

//         // If panel is open, don't spam toasts
//         if (showNotificationsRef.current) return;

//         // Throttle toasts
//         const now = Date.now();
//         if (now - lastToastAtRef.current < TOAST_MIN_GAP_MS) return;
//         lastToastAtRef.current = now;

//         // Sound only when toast will show
//         playSound();

//         // Limit visible toasts
//         if (activeToastIdsRef.current.length >= MAX_ACTIVE_TOASTS) {
//           const oldId = activeToastIdsRef.current.shift();
//           toast.dismiss(oldId);
//         }

//         const id = toast.custom(
//           (t) => (
//             <div
//               className={`${
//                 t.visible ? "animate-enter" : "animate-leave"
//               } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
//             >
//               <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
//                 <div className="bg-blue-100 rounded-full p-2">
//                   <Bell size={16} className="text-blue-600" />
//                 </div>
//                 <div className="flex-1 w-full">
//                   <p className="text-sm font-medium text-gray-900">
//                     {data?.title}
//                   </p>
//                   <p
//                     className="text-xs text-gray-500"
//                     dangerouslySetInnerHTML={{ __html: data?.message || "" }}
//                   />
//                   <p className="text-[10px] text-right text-gray-400 mt-1">
//                     {(() => {
//                       const date = new Date(messageWithTime.received_at);
//                       let hours = date.getHours();
//                       const minutes = String(date.getMinutes()).padStart(
//                         2,
//                         "0"
//                       );
//                       const ampm = hours >= 12 ? "PM" : "AM";
//                       hours = hours % 12 || 12;
//                       return `${hours}:${minutes} ${ampm}`;
//                     })()}
//                   </p>
//                 </div>
//                 {data?.lead_id && (
//                   <button
//                     onClick={() => router.push(`/lead/${data?.lead_id}`)}
//                     className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
//                   >
//                     View
//                   </button>
//                 )}
//               </div>
//             </div>
//           ),
//           {
//             position: "bottom-right",
//             duration: 1000,
//           }
//         );

//         activeToastIdsRef.current.push(id);
//       };

//       socket.onerror = () => {
//         // let onclose decide reconnect so throttling works properly
//         try {
//           socket.close();
//         } catch {}
//       };

//       socket.onclose = () => {
//         setIsConnect?.(false);
//         if (!allowReconnectRef.current) return; // intentional teardown
//         if (retryCountRef.current >= 10) return;
//         retryCountRef.current += 1;
//         const base = Math.min(30000, 1000 * 2 ** retryCountRef.current);
//         const jitter = Math.floor(Math.random() * 500);
//         reconnectTimerRef.current = setTimeout(connect, base + jitter);
//       };
//     };

//     connect();

//     return () => {
//       // Intentional teardown: block auto-reconnect and close socket
//       allowReconnectRef.current = false;
//       try {
//         socketRef.current?.close();
//       } catch {}
//       if (reconnectTimerRef.current) {
//         clearTimeout(reconnectTimerRef.current);
//         reconnectTimerRef.current = null;
//       }
//       // Dismiss any remaining toasts
//       activeToastIdsRef.current.forEach((id) => toast.dismiss(id));
//       activeToastIdsRef.current = [];
//       // Re-enable reconnect for the next mount/employee change
//       setTimeout(() => {
//         allowReconnectRef.current = true;
//       }, 0);
//     };
//     // 🔑 only depend on employee_code so it won't reconnect on UI toggles
//   }, [employee_code, setIsConnect]);

//   // Click-outside to close the panel
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
//         setShowNotifications(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div className="relative" ref={wrapperRef}>
//       <button
//         onClick={() => setShowNotifications((s) => !s)}
//         className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
//         title="Notifications"
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
//                 {/* Sound toggle */}
//                 <button
//                   onClick={() => setSoundEnabled((s) => !s)}
//                   className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
//                     soundEnabled
//                       ? "bg-green-50 text-green-700 border-green-200"
//                       : "bg-gray-50 text-gray-600 border-gray-200"
//                   }`}
//                   title={
//                     soundEnabled ? "Mute notifications" : "Unmute notifications"
//                   }
//                 >
//                   {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
//                   {soundEnabled ? "Sound On" : "Sound Off"}
//                 </button>

//                 <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
//                   {messages?.length}
//                 </span>

//                 {messages.length > 0 && (
//                   <button
//                     onClick={() => setMessages([])}
//                     className="text-xs text-blue-600 hover:underline hover:text-blue-800"
//                   >
//                     Clear All
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="p-4 max-h-60 overflow-y-auto space-y-3">
//             {messages?.length > 0 ? (
//               messages?.map((val, index) => (
//                 <div
//                   key={`${val?.received_at?.toString?.() || "msg"}-${index}`}
//                   className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
//                 >
//                   {/* Top row: bell + title + actions */}
//                   <div className="flex items-start gap-3">
//                     <div className="shrink-0 rounded-full bg-blue-50 p-2">
//                       <Bell size={16} className="text-blue-600" />
//                     </div>

//                     <div className="min-w-0 flex-1">
//                       <div className="flex items-start justify-between gap-3">
//                         <p className="text-sm font-semibold text-gray-900 truncate">
//                           {val?.title || "Notification"}
//                         </p>

//                         <div className="flex items-center gap-2 shrink-0">
//                           {val?.lead_id && (
//                             <button
//                               onClick={() =>
//                                 router.push(`/lead/${val.lead_id}`)
//                               }
//                               className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
//                               title="Open lead"
//                             >
//                               View
//                             </button>
//                           )}

//                           <button
//                             onClick={() =>
//                               setMessages((prev) => {
//                                 const next = [...prev];
//                                 next.splice(index, 1);
//                                 return next;
//                               })
//                             }
//                             className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-50 transition"
//                             title="Dismiss"
//                           >
//                             <X size={14} />
//                           </button>
//                         </div>
//                       </div>

//                       {/* Message body */}
//                       <p
//                         className="mt-1 text-xs text-gray-600 break-words"
//                         dangerouslySetInnerHTML={{ __html: val?.message || "" }}
//                       />

//                       {/* Time */}
//                       {val?.received_at && (
//                         <p className="mt-1 text-[10px] text-gray-400 text-right">
//                           {new Date(val.received_at).toLocaleTimeString()}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="flex items-center justify-center">
//                 <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white/60 p-6 text-center">
//                   <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
//                     <BellOff className="h-6 w-6 text-gray-400" />
//                   </div>
//                   <p className="text-sm font-semibold text-gray-700">
//                     No notifications
//                   </p>
//                   <p className="mt-1 text-xs text-gray-500">
//                     You’re all caught up. New alerts will appear here.
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, BellOff } from "lucide-react";
import toast from "react-hot-toast";
import { WS_BASE_URL_full } from "@/api/Axios";
import { useRouter } from "next/navigation";

/* -------------------------- Config -------------------------- */
const TOAST_MIN_GAP_MS = 2000;
const MAX_ACTIVE_TOASTS = 3;
const MAX_MESSAGES_BUFFER = 200;
const MAX_WS_RETRIES_BEFORE_FALLBACK = 3;  // after this, we switch to SSE/polling
const POLL_INTERVAL_MS = 5000;

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
function wsBaseFromHttpBase(httpBase = "") {
  if (/^https:\/\//i.test(httpBase)) return httpBase.replace(/^https:/i, "wss:");
  if (/^http:\/\//i.test(httpBase)) return httpBase.replace(/^http:/i, "ws:");
  return httpBase;
}

/** Build a robust WS URL from a base (http/https or ws/wss) and a path. */
function buildWsUrl(base, path) {
  try {
    // If base already ws(s), use it directly.
    if (isWsLike(base)) {
      const u = new URL(base);
      return `${u.protocol}//${u.host}${path}`;
    }
    // If base http(s), convert to ws(s) with same host:port.
    if (isHttpLike(base)) {
      const u = new URL(base);
      const scheme = u.protocol === "https:" ? "wss:" : "ws:";
      return `${scheme}//${u.host}${path}`;
    }
    // Fallback to current location
    const here = new URL(window.location.href);
    const scheme = here.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${here.host}${path}`;
  } catch {
    // Very old browsers: best effort
    const isHttps = (typeof location !== "undefined") && location.protocol === "https:";
    const scheme = isHttps ? "wss:" : "ws:";
    const host = (typeof location !== "undefined") ? location.host : "";
    return `${scheme}//${host}${path}`;
  }
}

/** Build an HTTP URL (for SSE/polling) from the same base. */
function buildHttpUrl(base, pathWithQuery = "") {
  try {
    if (isHttpLike(base)) {
      const u = new URL(base);
      return `${u.protocol}//${u.host}${pathWithQuery}`;
    }
    if (isWsLike(base)) {
      const httpBase = httpBaseFromWsBase(base);
      const u = new URL(httpBase);
      return `${u.protocol}//${u.host}${pathWithQuery}`;
    }
    const here = new URL(window.location.href);
    return `${here.protocol}//${here.host}${pathWithQuery}`;
  } catch {
    const isHttps = (typeof location !== "undefined") && location.protocol === "https:";
    const scheme = isHttps ? "https:" : "http:";
    const host = (typeof location !== "undefined") ? location.host : "";
    return `${scheme}//${host}${pathWithQuery}`;
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
  useEffect(() => { showNotificationsRef.current = showNotifications; }, [showNotifications]);

  // Fallback refs
  const sseRef = useRef(null);
  const pollTimerRef = useRef(null);
  const lastSeenServerTsRef = useRef(0); // server-provided ts (epoch ms or iso) for pull delta

  /* ---------- Init sound pref + audio ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage?.getItem(SOUND_PREF_KEY);
      if (stored === "0") setSoundEnabled(false);
    } catch {}
    try {
      const el = new Audio(AUDIO_URL);
      el.preload = "auto";
      el.volume = 1.0;
      audioRef.current = el;
    } catch { audioRef.current = null; }

    function markInteraction() {
      userInteractedRef.current = true;
      const a = audioRef.current;
      if (a?.play) {
        try {
          const p = a.play();
          if (p?.then) {
            p.then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
          }
        } catch {}
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
    try { window.localStorage?.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0"); } catch {}
  }, [soundEnabled]);

  function playSound() {
    if (!soundEnabled) return;
    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      const p = el.play?.();
      p?.catch(() => {});
    } catch {}
  }

  /* ---------------- message handler (WS/SSE/Poll reuse) ---------------- */
  function handleIncoming(obj) {
    if (!obj) return;
    const messageWithTime = {
      title: obj.title,
      message: obj.message,
      lead_id: obj.lead_id,
      type: obj.type,
      // prefer server ts if present for de-dup (polling)
      received_at: obj.ts ? new Date(obj.ts) : new Date(),
    };

    // keep last seen server timestamp if provided
    if (obj.ts) {
      const tsNum = typeof obj.ts === "number" ? obj.ts : Date.parse(obj.ts);
      if (!Number.isNaN(tsNum)) lastSeenServerTsRef.current = Math.max(lastSeenServerTsRef.current, tsNum);
    }

    setMessages((prev) => {
      const next = prev ? prev.slice() : [];
      next.push(messageWithTime);
      if (next.length > MAX_MESSAGES_BUFFER) next.splice(0, next.length - MAX_MESSAGES_BUFFER);
      return next;
    });

    // suppress toast when panel is open
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
          className={(t?.visible ? "animate-enter" : "animate-leave") +
            " max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5"}
        >
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
            <div className="bg-blue-100 rounded-full p-2">
              <Bell size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 w-full">
              <p className="text-sm font-medium text-gray-900">{obj.title || ""}</p>
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
    try { sseRef.current?.close?.(); } catch {}
    sseRef.current = null;
  }
  function stopPolling() {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }
  function startSSE() {
    stopSSE(); stopPolling();
    if (!("EventSource" in window)) return startPolling();

    const httpUrl = buildHttpUrl(WS_BASE_URL_full,
      `/sse/notification/${encodeURIComponent(String(employee_code))}?after=${encodeURIComponent(String(lastSeenServerTsRef.current))}`
    );
    try {
      const es = new EventSource(httpUrl, { withCredentials: true });
      sseRef.current = es;
      es.onmessage = (e) => {
        try { handleIncoming(JSON.parse(e.data)); } catch {}
      };
      es.onerror = () => { stopSSE(); startPolling(); };
    } catch { startPolling(); }
  }
  function startPolling() {
    stopPolling();
    const httpBase = buildHttpUrl(WS_BASE_URL_full, "/"); // get protocol+host
    // strip trailing slash for concatenation clarity
    const root = httpBase.replace(/\/+$/, "");
    const url = `${root}/api/notifications/pull?employee_code=${encodeURIComponent(String(employee_code))}&after=${encodeURIComponent(String(lastSeenServerTsRef.current))}`;

    async function pollOnce() {
      try {
        const res = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!res.ok) return;
        const arr = await res.json();
        if (Array.isArray(arr)) {
          for (const m of arr) handleIncoming(m);
        }
      } catch {}
    }

    pollOnce(); // immediate
    pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
  }

  /* ---------------- WebSocket connect (primary) ---------------- */
  useEffect(() => {
    if (!employee_code) return;
    if (typeof window === "undefined") return;

    function isSocketAlive(ws) {
      return ws && (ws.readyState === window.WebSocket.OPEN || ws.readyState === window.WebSocket.CONNECTING);
    }

    function connectWS() {
      if (typeof window.WebSocket === "undefined") { startSSE(); return; }
      if (isSocketAlive(socketRef.current)) return;

      const path = `/ws/notification/${String(employee_code)}`;
      const url = buildWsUrl(WS_BASE_URL_full, path);

      let socket;
      try { socket = new window.WebSocket(url); }
      catch { return startSSE(); }

      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnect?.(true);
        retryCountRef.current = 0;
        if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
        // on successful WS open, stop any fallbacks
        stopSSE(); stopPolling();
      };

      socket.onmessage = (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        // ignore heartbeats
        if (data?.type === "connection_confirmed" || data?.type === "ping" || data?.type === "pong") return;
        handleIncoming(data);
      };

      socket.onerror = () => { try { socket.close(); } catch {} };

      socket.onclose = () => {
        setIsConnect?.(false);
        // after a few failed tries, give up to fallbacks
        if (retryCountRef.current >= MAX_WS_RETRIES_BEFORE_FALLBACK) { startSSE(); return; }
        if (!allowReconnectRef.current) return;
        retryCountRef.current += 1;
        const base = Math.min(30000, 1000 * Math.pow(2, retryCountRef.current));
        const jitter = Math.floor(Math.random() * 500);
        reconnectTimerRef.current = setTimeout(connectWS, base + jitter);
      };
    }

    connectWS();

    return () => {
      allowReconnectRef.current = false;
      try { socketRef.current?.close(); } catch {}
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      stopSSE(); stopPolling();
      // dismiss all toasts
      for (let i = 0; i < activeToastIdsRef.current.length; i++) toast.dismiss(activeToastIdsRef.current[i]);
      activeToastIdsRef.current = [];
      setTimeout(() => { allowReconnectRef.current = true; }, 0);
    };
  }, [employee_code, setIsConnect]);

  /* ---------------- Click-outside to close panel ---------------- */
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <div className="relative" ref={wrapperRef}>
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
                    (soundEnabled ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200")
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
                  <button onClick={() => setMessages([])} className="text-xs text-blue-600 hover:underline hover:text-blue-800">
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
                  <div key={(ts ? String(ts) : "msg") + "-" + String(index)} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-full bg-blue-50 p-2">
                        <Bell size={16} className="text-blue-600" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>

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

                        <p className="mt-1 text-xs text-gray-600 break-words" dangerouslySetInnerHTML={{ __html: msgHtml }} />
                        {ts ? <p className="mt-1 text-[10px] text-gray-400 text-right">{formatTime(ts)}</p> : null}
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
                  <p className="mt-1 text-xs text-gray-500">You’re all caught up. New alerts will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

