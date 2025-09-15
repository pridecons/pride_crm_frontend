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
        if (obj && obj.employee_code) {
          setCode(obj.employee_code);
          return;
        }
        if (obj && obj.sub) {
          setCode(obj.sub);
          return;
        }
      }
      const tok = Cookies.get("access_token");
      if (tok) {
        const p = jwtDecode(tok);
        setCode((p && (p.sub || p.employee_code)) || null);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return code;
}

export function useChatSocket({ threadId, onEvent, enabled = true }) {
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);
  const timers = useRef({ reconnect: null, heartbeat: null });
  const attemptsRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timers.current.heartbeat) clearInterval(timers.current.heartbeat);
    if (timers.current.reconnect) clearTimeout(timers.current.reconnect);
    timers.current.heartbeat = null;
    timers.current.reconnect = null;
  }, []);

  const closeSocket = useCallback(() => {
    try {
      if (wsRef.current && typeof wsRef.current.close === "function") {
        wsRef.current.close(1000, "navigate");
      }
    } catch (e) {}
    wsRef.current = null;
    setReady(false);
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!enabled || !threadId) {
      closeSocket();
      return;
    }

    const token = Cookies.get("access_token");
    const httpBase =
      axiosInstance && axiosInstance.defaults
        ? axiosInstance.defaults.baseURL
        : undefined;
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

          for (let i = 0; i < joinMsgs.length; i++) {
            try {
              ws.send(JSON.stringify(joinMsgs[i]));
            } catch (e) {}
          }

          timers.current.heartbeat = setInterval(() => {
            try {
              ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
            } catch (e) {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let unwrapped;
          try {
            unwrapped = unwrapWsEvent(ev.data);
          } catch (e) {
            return;
          }
          const rawType =
            (unwrapped && (unwrapped.type || unwrapped.event)) || "";
          const t = String(rawType).toLowerCase();

          if (t.indexOf("typing") >= 0 || t.indexOf("read") >= 0) {
            if (typeof onEvent === "function") {
              onEvent({
                type: t.indexOf("typing") >= 0 ? "typing" : "read",
                data: unwrapped,
              });
            }
            return;
          }

          if (t && t.indexOf("message") !== 0) {
            if (typeof onEvent === "function") {
              onEvent({ type: "misc", data: unwrapped });
            }
            return;
          }

          const norm = normalizeMessage(unwrapped);
          if (!norm || !norm.thread_id) {
            if (typeof onEvent === "function") {
              onEvent({ type: "misc", data: unwrapped });
            }
            return;
          }
          if (typeof onEvent === "function") {
            onEvent({ type: "message", data: norm });
          }
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
          } catch (e) {}
        };
      } catch (e) {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
      }
    };

    connect();
    return () => {
      closeSocket();
    };
  }, [threadId, enabled, closeSocket, onEvent, clearTimers]);

  const sendJson = useCallback(
    (obj) => {
      try {
        if (
          ready &&
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN
        ) {
          wsRef.current.send(JSON.stringify(obj));
          return true;
        }
      } catch (e) {}
      return false;
    },
    [ready]
  );

  return { ready, sendJson };
}

export function useInboxSocket({
  currentUser,
  onEvent,
  enabled = true,
  onFallbackTick,
}) {
  const wsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const timers = useRef({ heartbeat: null, reconnect: null, poll: null });
  const attemptsRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timers.current.heartbeat) clearInterval(timers.current.heartbeat);
    if (timers.current.reconnect) clearTimeout(timers.current.reconnect);
    if (timers.current.poll) clearInterval(timers.current.poll);
    timers.current.heartbeat = null;
    timers.current.reconnect = null;
    timers.current.poll = null;
  }, []);

  useEffect(() => {
    if (!enabled || !currentUser) {
      try {
        if (wsRef.current && typeof wsRef.current.close === "function") {
          wsRef.current.close(1000, "inbox-off");
        }
      } catch (e) {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
      return;
    }

    const token = Cookies.get("access_token");
    const httpBase =
      axiosInstance && axiosInstance.defaults
        ? axiosInstance.defaults.baseURL
        : undefined;
    const url = makeInboxWsUrl(httpBase, token);

    const startPollingFallback = () => {
      if (timers.current.poll) return;
      timers.current.poll = setInterval(() => {
        if (typeof onFallbackTick === "function") onFallbackTick();
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

          const joinMsgs = [
            { type: "subscribe_user", user: String(currentUser) },
            { type: "join", scope: "user", user: String(currentUser) },
            {
              event: "subscribe",
              payload: { scope: "user", user: String(currentUser) },
            },
            { action: "subscribe_all" },
          ];
          for (let i = 0; i < joinMsgs.length; i++) {
            try {
              ws.send(JSON.stringify(joinMsgs[i]));
            } catch (e) {}
          }

          timers.current.heartbeat = setInterval(() => {
            try {
              ws.send(JSON.stringify({ type: "ping", at: Date.now() }));
            } catch (e) {}
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let unwrapped;
          try {
            unwrapped = unwrapWsEvent(ev.data);
          } catch (e) {
            return;
          }
          const rawType =
            (unwrapped && (unwrapped.type || unwrapped.event)) || "";
          const t = String(rawType).toLowerCase();

          if (t.indexOf("read") >= 0) {
            if (typeof onEvent === "function")
              onEvent({ kind: "read", data: unwrapped });
            return;
          }
          if (t.indexOf("typing") >= 0) {
            if (typeof onEvent === "function")
              onEvent({ kind: "typing", data: unwrapped });
            return;
          }
          if (t.indexOf("message") >= 0) {
            const norm = normalizeMessage(unwrapped);
            if (norm && norm.thread_id) {
              if (typeof onEvent === "function")
                onEvent({ kind: "message", data: norm });
            }
          }
        };

        ws.onclose = () => {
          setReady(false);
          clearTimers();
          const attempt = (attemptsRef.current =
            (attemptsRef.current || 0) + 1);
          const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
          startPollingFallback();
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch (e) {}
        };
      } catch (e) {
        const attempt = (attemptsRef.current = (attemptsRef.current || 0) + 1);
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
        startPollingFallback();
      }
    };

    connect();
    return () => {
      try {
        if (wsRef.current && typeof wsRef.current.close === "function") {
          wsRef.current.close(1000, "inbox-unmount");
        }
      } catch (e) {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
    };
  }, [enabled, currentUser, onEvent, onFallbackTick, clearTimers]);

  return { inboxReady: ready };
}
