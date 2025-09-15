// src/components/chat/hooks.js
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";
import {
  makeWsUrl,
  makeInboxWsUrl,
  normalizeMessage,
  unwrapWsEvent,
} from "./utils";

export function useEmployeeCode() {
  const [code, setCode] = useState(null);
  useEffect(() => {
    try {
      const ui = Cookies.get("user_info");
      if (ui) {
        const obj = JSON.parse(ui);
        if (obj?.employee_code) return setCode(obj.employee_code);
        if (obj?.sub) return setCode(obj.sub);
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

export function useChatSocket({ threadId, onEvent, enabled = true }) {
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);
  const timers = useRef({ reconnect: null, heartbeat: null });
  const attemptsRef = useRef(0);

  const clearTimers = () => {
    if (timers.current.heartbeat) clearInterval(timers.current.heartbeat);
    if (timers.current.reconnect) clearTimeout(timers.current.reconnect);
    timers.current.heartbeat = timers.current.reconnect = null;
  };

  const closeSocket = useCallback(() => {
  try { wsRef.current?.close(1000, "navigate"); } catch {}
  wsRef.current = null;
  setReady(false);
  clearTimers();
}, []);

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
          const room = String(threadId);
          const joinMsgs = [
            { type: "join", thread_id: room },
            { action: "join", thread_id: room },
            { event: "subscribe", payload: { thread_id: room } },
            { type: "subscribe", room_id: room },
          ];
          for (const j of joinMsgs) { try { ws.send(JSON.stringify(j)); } catch {} }
          timers.current.heartbeat = setInterval(() => {
            try { ws.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          const unwrapped = unwrapWsEvent(ev.data);
          const t = (unwrapped?.type || unwrapped?.event || "").toString().toLowerCase();

          if (t.includes("typing") || t.includes("read")) {
            onEvent?.({ type: t.includes("typing") ? "typing" : "read", data: unwrapped });
            return;
          }
          if (t && !t.startsWith("message")) {
            onEvent?.({ type: "misc", data: unwrapped });
            return;
          }
          const norm = normalizeMessage(unwrapped);
          if (!norm || !norm.thread_id) { onEvent?.({ type: "misc", data: unwrapped }); return; }
          onEvent?.({ type: "message", data: norm });
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
  },[threadId, enabled, closeSocket, onEvent]);

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

export function useInboxSocket({ currentUser, onEvent, enabled = true, onFallbackTick }) {
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
      try { wsRef.current?.close(1000, "inbox-off"); } catch {}
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
      timers.current.poll = setInterval(() => { onFallbackTick?.(); }, 2000);
    };

    const connect = () => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setReady(true);
          attemptsRef.current = 0;
          clearTimers();
          const joinMsgs = [
            { type: "subscribe_user", user: String(currentUser) },
            { type: "join", scope: "user", user: String(currentUser) },
            { event: "subscribe", payload: { scope: "user", user: String(currentUser) } },
            { action: "subscribe_all" },
          ];
          for (const j of joinMsgs) { try { ws.send(JSON.stringify(j)); } catch {} }
          timers.current.heartbeat = setInterval(() => {
            try { ws.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          const unwrapped = unwrapWsEvent(ev.data);
          const t = (unwrapped?.type || unwrapped?.event || "").toString().toLowerCase();
          if (t.includes("read")) { onEvent?.({ kind: "read", data: unwrapped }); return; }
          if (t.includes("typing")) { onEvent?.({ kind: "typing", data: unwrapped }); return; }
          if (t.includes("message")) {
            const norm = normalizeMessage(unwrapped);
            if (norm && norm.thread_id) onEvent?.({ kind: "message", data: norm });
          }
        };

        ws.onclose = () => {
          setReady(false);
          clearTimers();
          const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
          startPollingFallback();
        };

        ws.onerror = () => { try { ws.close(); } catch {} };
      } catch {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
        startPollingFallback();
      }
    };

    connect();
    return () => {
      try { wsRef.current?.close(1000, "inbox-unmount"); } catch {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
    };
  }, [enabled, currentUser, onEvent, onFallbackTick]);

  return { inboxReady: ready };
}
