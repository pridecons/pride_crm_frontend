"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X, BellOff } from "lucide-react";
import toast from "react-hot-toast";
import { WS_BASE_URL_full } from "@/api/Axios";
import { useRouter } from "next/navigation";

const TOAST_MIN_GAP_MS = 2000; // minimum time between toasts
const MAX_ACTIVE_TOASTS = 3; // max toasts visible at once
const MAX_MESSAGES_BUFFER = 200; // cap stored notifications
const SOUND_PREF_KEY = "notifications_sound_enabled";

export default function ShowNotifications({ setIsConnect, employee_code }) {
  const router = useRouter();

  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const allowReconnectRef = useRef(true); // block reconnects during intentional teardown
  const socketRef = useRef(null);
  const wrapperRef = useRef(null);

  const audioUrl = "/notification.mp3";
  const audioRef = useRef(null);
  const userInteractedRef = useRef(false);

  const lastToastAtRef = useRef(0);
  const activeToastIdsRef = useRef([]);

  // keep a ref in sync so we can read the latest value inside WS handlers
  const showNotificationsRef = useRef(false);
  useEffect(() => {
    showNotificationsRef.current = showNotifications;
  }, [showNotifications]);

  // Initialize sound preference & audio element
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(SOUND_PREF_KEY);
    if (stored === "0") setSoundEnabled(false);

    const el = new Audio(audioUrl);
    el.preload = "auto";
    el.volume = 1.0;
    audioRef.current = el;

    const markInteraction = () => {
      userInteractedRef.current = true;
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
    window.addEventListener("click", markInteraction);
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("touchstart", markInteraction);

    return () => {
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
  }, []);

  // Persist sound preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  // Sound helper
  const playSound = () => {
    if (!soundEnabled) return;
    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          // likely blocked until first interaction; the markInteraction handler warms it up
        });
      }
    } catch (err) {
      console.error("Failed to play notification sound:", err);
    }
  };

  // WebSocket connect: only when employee_code changes or on first mount
  useEffect(() => {
    if (!employee_code) return;

    const isSocketAlive = (ws) =>
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING);

    const connect = () => {
      // Guard: if socket is already open or connecting, do not create a new one
      if (isSocketAlive(socketRef.current)) return;

      const socket = new WebSocket(
        `${WS_BASE_URL_full}/ws/notification/${employee_code}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnect?.(true);
        retryCountRef.current = 0;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // ignore malformed payloads
        }

        if (["connection_confirmed", "ping", "pong"].includes(data?.type))
          return;

        const messageWithTime = { ...data, received_at: new Date() };

        // push to list (with buffer cap)
        setMessages((prev) => {
          const next = [...prev, messageWithTime];
          if (next.length > MAX_MESSAGES_BUFFER)
            next.splice(0, next.length - MAX_MESSAGES_BUFFER);
          return next;
        });

        // If panel is open, don't spam toasts
        if (showNotificationsRef.current) return;

        // Throttle toasts
        const now = Date.now();
        if (now - lastToastAtRef.current < TOAST_MIN_GAP_MS) return;
        lastToastAtRef.current = now;

        // Sound only when toast will show
        playSound();

        // Limit visible toasts
        if (activeToastIdsRef.current.length >= MAX_ACTIVE_TOASTS) {
          const oldId = activeToastIdsRef.current.shift();
          toast.dismiss(oldId);
        }

        const id = toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 w-full">
                <div className="bg-blue-100 rounded-full p-2">
                  <Bell size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-sm font-medium text-gray-900">
                    {data?.title}
                  </p>
                  <p
                    className="text-xs text-gray-500"
                    dangerouslySetInnerHTML={{ __html: data?.message || "" }}
                  />
                  <p className="text-[10px] text-right text-gray-400 mt-1">
                    {(() => {
                      const date = new Date(messageWithTime.received_at);
                      let hours = date.getHours();
                      const minutes = String(date.getMinutes()).padStart(
                        2,
                        "0"
                      );
                      const ampm = hours >= 12 ? "PM" : "AM";
                      hours = hours % 12 || 12;
                      return `${hours}:${minutes} ${ampm}`;
                    })()}
                  </p>
                </div>
                {data?.lead_id && (
                  <button
                    onClick={() => router.push(`/lead/${data?.lead_id}`)}
                    className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          ),
          {
            position: "bottom-right",
            duration: 1000,
          }
        );

        activeToastIdsRef.current.push(id);
      };

      socket.onerror = () => {
        // let onclose decide reconnect so throttling works properly
        try {
          socket.close();
        } catch {}
      };

      socket.onclose = () => {
        setIsConnect?.(false);
        if (!allowReconnectRef.current) return; // intentional teardown
        if (retryCountRef.current >= 10) return;
        retryCountRef.current += 1;
        const base = Math.min(30000, 1000 * 2 ** retryCountRef.current);
        const jitter = Math.floor(Math.random() * 500);
        reconnectTimerRef.current = setTimeout(connect, base + jitter);
      };
    };

    connect();

    return () => {
      // Intentional teardown: block auto-reconnect and close socket
      allowReconnectRef.current = false;
      try {
        socketRef.current?.close();
      } catch {}
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      // Dismiss any remaining toasts
      activeToastIdsRef.current.forEach((id) => toast.dismiss(id));
      activeToastIdsRef.current = [];
      // Re-enable reconnect for the next mount/employee change
      setTimeout(() => {
        allowReconnectRef.current = true;
      }, 0);
    };
    // 🔑 only depend on employee_code so it won't reconnect on UI toggles
  }, [employee_code, setIsConnect]);

  // Click-outside to close the panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setShowNotifications((s) => !s)}
        className="relative p-3 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
        title="Notifications"
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
                {/* Sound toggle */}
                <button
                  onClick={() => setSoundEnabled((s) => !s)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
                    soundEnabled
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                  title={
                    soundEnabled ? "Mute notifications" : "Unmute notifications"
                  }
                >
                  {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  {soundEnabled ? "Sound On" : "Sound Off"}
                </button>

                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {messages?.length}
                </span>

                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-xs text-blue-600 hover:underline hover:text-blue-800"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto space-y-3">
            {messages?.length > 0 ? (
              messages?.map((val, index) => (
                <div
                  key={`${val?.received_at?.toString?.() || "msg"}-${index}`}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                >
                  {/* Top row: bell + title + actions */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-full bg-blue-50 p-2">
                      <Bell size={16} className="text-blue-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {val?.title || "Notification"}
                        </p>

                        <div className="flex items-center gap-2 shrink-0">
                          {val?.lead_id && (
                            <button
                              onClick={() =>
                                router.push(`/lead/${val.lead_id}`)
                              }
                              className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
                              title="Open lead"
                            >
                              View
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setMessages((prev) => {
                                const next = [...prev];
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

                      {/* Message body */}
                      <p
                        className="mt-1 text-xs text-gray-600 break-words"
                        dangerouslySetInnerHTML={{ __html: val?.message || "" }}
                      />

                      {/* Time */}
                      {val?.received_at && (
                        <p className="mt-1 text-[10px] text-gray-400 text-right">
                          {new Date(val.received_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white/60 p-6 text-center">
                  <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-gray-100 p-3">
                    <BellOff className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    No notifications
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    You’re all caught up. New alerts will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
