import { useEffect, useRef, useState } from "react";
import { Bell, X, BellOff } from "lucide-react";
import toast from "react-hot-toast";

const TOAST_MIN_GAP_MS = 2000; // minimum time between toasts
const MAX_ACTIVE_TOASTS = 3; // max toasts visible at once
const MAX_MESSAGES_BUFFER = 200; // cap stored notifications

export default function ShowNotifications({ setIsConnect, employee_code }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const retryCountRef = useRef(0);
  const socketRef = useRef(null);
  const wrapperRef = useRef(null);

  // For throttling & limiting visible toasts
  const lastToastAtRef = useRef(0);
  const activeToastIdsRef = useRef([]);

  useEffect(() => {
    if (!employee_code) return;

    const connect = () => {
      const socket = new WebSocket(
        `wss://crm.24x7techelp.com/api/v1/ws/notification/${employee_code}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnect(true);
        retryCountRef.current = 0;
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

        // If the panel is open, don't spam toasts
        if (showNotifications) return;

        // Throttle toasts
        const now = Date.now();
        if (now - lastToastAtRef.current < TOAST_MIN_GAP_MS) return;
        lastToastAtRef.current = now;

        // Limit visible toasts: dismiss oldest if exceeding MAX_ACTIVE_TOASTS
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
              </div>
            </div>
          ),
          {
            position: "bottom-right",
            duration: 4000,
          }
        );

        activeToastIdsRef.current.push(id);
      };

      socket.onerror = () => {
        // prevent tight loops on certain failures
        socket.close();
      };

      socket.onclose = () => {
        setIsConnect(false);
        if (retryCountRef.current < 10) {
          retryCountRef.current += 1;
          // Exponential backoff with jitter
          const base = Math.min(30000, 1000 * 2 ** retryCountRef.current);
          const jitter = Math.floor(Math.random() * 500);
          setTimeout(connect, base + jitter);
        }
      };
    };

    connect();
    return () => {
      // Clean up: close socket & remove any remaining toasts
      socketRef.current?.close();
      activeToastIdsRef.current.forEach((id) => toast.dismiss(id));
      activeToastIdsRef.current = [];
    };
  }, [setIsConnect, employee_code, showNotifications]);

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
                  className="relative flex items-start space-x-3 p-3 rounded-xl bg-blue-50 border border-blue-100 max-w-full"
                >
                  <div className="bg-blue-100 rounded-full p-2">
                    <Bell size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-gray-900">
                      {val?.title}
                    </p>
                    <p
                      className="text-xs text-gray-500 break-words whitespace-normal w-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: val?.message || "" }}
                    />
                    {val?.received_at && (
                      <p className="text-[10px] text-right text-gray-400 mt-1">
                        {new Date(val.received_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setMessages((prev) => {
                        const next = [...prev];
                        next.splice(index, 1);
                        return next;
                      });
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <X size={14} />
                  </button>
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
