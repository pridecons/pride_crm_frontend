"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { WS_BASE_URL_full } from "@/api/Axios";

const ShowChatCount = ({ user }) => {
  const router = useRouter();
  const [chatUnread, setChatUnread] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const backoffRef = useRef(0); // ms
  const manuallyClosed = useRef(false);

  const wsUrl =
    typeof window !== "undefined"
      ? `${WS_BASE_URL_full.replace(/\/$/, "")}/ws/notify?u=${encodeURIComponent(
          user || ""
        )}`
      : "";

  const clearAllTimers = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  };

  const scheduleReconnect = () => {
    if (manuallyClosed.current) return;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    backoffRef.current = Math.min(
      backoffRef.current ? backoffRef.current * 2 : 500,
      20000
    );
    reconnectTimer.current = setTimeout(openSocket, backoffRef.current);
  };

  const openSocket = () => {
    if (typeof window === "undefined") return;
    if (!user) return;

    const WSImpl = window.WebSocket || window.MozWebSocket;
    if (!WSImpl) return; // very old browser without WS

    clearAllTimers();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    try {
      const ws = new WSImpl(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = 0;

        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
          try {
            ws.send("ping");
          } catch {}
        }, 25000);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data && data.type === "notify.snapshot") {
            const total = Number(data.total_unseen || 0);
            if (!Number.isNaN(total)) setChatUnread(total);
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onerror = () => {
        // onclose will handle reconnect
      };

      ws.onclose = () => {
        if (manuallyClosed.current) return;
        scheduleReconnect();
      };
    } catch {
      scheduleReconnect();
    }
  };

  useEffect(() => {
    manuallyClosed.current = false;
    openSocket();

    return () => {
      manuallyClosed.current = true;
      clearAllTimers();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (!wsRef.current || wsRef.current.readyState !== 1) openSocket();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push("/chatting")}
      className="group relative pr-2 rounded-xl text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
      aria-label="Open chat"
      title="Chat"
    >
      <MessageCircle
        size={18}
        className="transition-transform group-hover:scale-105"
      />
      {chatUnread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center z-10">
          {chatUnread > 99 ? "99+" : chatUnread}
        </span>
      )}
    </button>
  );
};

export default ShowChatCount;
