// src/components/chat/hooks.js
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";
import { makeWsUrl, makeInboxWsUrl, normalizeMessage, unwrapWsEvent } from "./utils";

/* ------------------------------ Small helpers ------------------------------ */

function safeJSONParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getCookie(name) {
  try { return Cookies.get(name) || null; } catch (_) { return null; }
}

function hasWS() {
  try { return typeof window !== "undefined" && typeof window.WebSocket === "function"; } catch (_) { return false; }
}

function clearTimer(ref, key, isInterval) {
  if (!ref.current) return;
  var t = ref.current[key];
  if (t) {
    try {
      if (isInterval) clearInterval(t);
      else clearTimeout(t);
    } catch (_) {}
    ref.current[key] = null;
  }
}

/* --------------------------------- Hooks ---------------------------------- */

export function useEmployeeCode() {
  const [code, setCode] = useState(null);

  useEffect(function () {
    try {
      var ui = getCookie("user_info");
      if (ui) {
        var obj = safeJSONParse(ui) || {};
        if (obj && obj.employee_code) { setCode(obj.employee_code); return; }
        if (obj && obj.sub) { setCode(obj.sub); return; }
      }
      var tok = getCookie("access_token");
      if (tok) {
        var p = jwtDecode(tok) || {};
        setCode((p && (p.sub || p.employee_code)) ? (p.sub || p.employee_code) : null);
      }
    } catch (_) {}
  }, []);

  return code;
}

export function useChatSocket(options) {
  options = options || {};
  var threadId   = options.threadId;
  var onEvent    = options.onEvent;
  var enabled    = (typeof options.enabled === "boolean") ? options.enabled : true;

  const [ready, setReady] = useState(false);
  const wsRef    = useRef(null);
  const timers   = useRef({ reconnect: null, heartbeat: null });
  const attempts = useRef(0);

  const clearTimers = useCallback(function () {
    clearTimer(timers, "heartbeat", true);
    clearTimer(timers, "reconnect", false);
  }, []);

  const closeSocket = useCallback(function () {
    try {
      if (wsRef.current && typeof wsRef.current.close === "function") {
        // 1000 = normal closure; reason is optional and supported widely
        wsRef.current.close(1000, "navigate");
      }
    } catch (_) {}
    wsRef.current = null;
    setReady(false);
    clearTimers();
  }, [clearTimers]);

  useEffect(function () {
    if (!enabled || !threadId) { closeSocket(); return; }
    if (!hasWS()) { setReady(false); return; }

    var token = getCookie("access_token");
    var httpBase = (axiosInstance && axiosInstance.defaults && axiosInstance.defaults.baseURL) ? axiosInstance.defaults.baseURL : "";
    var url = makeWsUrl(httpBase, threadId, token);

    function connect() {
      try {
        var ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = function () {
          setReady(true);
          attempts.current = 0;
          clearTimers();

          var room = String(threadId);
          var joinMsgs = [
            { type: "join", thread_id: room },
            { action: "join", thread_id: room },
            { event: "subscribe", payload: { thread_id: room } },
            { type: "subscribe", room_id: room }
          ];

          for (var i = 0; i < joinMsgs.length; i++) {
            try { ws.send(JSON.stringify(joinMsgs[i])); } catch (_) {}
          }

          timers.current.heartbeat = setInterval(function () {
            try { ws.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch (_) {}
          }, 25000);
        };

        ws.onmessage = function (ev) {
          var payload = ev && ev.data ? ev.data : null;
          var unwrapped = unwrapWsEvent(payload);
          var typeRaw = (unwrapped && (unwrapped.type || unwrapped.event)) ? (unwrapped.type || unwrapped.event) : "";
          var t = String(typeRaw).toLowerCase();

          if (t.indexOf("typing") !== -1 || t.indexOf("read") !== -1) {
            if (onEvent) onEvent({ type: (t.indexOf("typing") !== -1 ? "typing" : "read"), data: unwrapped });
            return;
          }
          if (t && t.indexOf("message") !== 0) {
            if (onEvent) onEvent({ type: "misc", data: unwrapped });
            return;
          }

          var norm = normalizeMessage(unwrapped);
          if (!norm || !norm.thread_id) {
            if (onEvent) onEvent({ type: "misc", data: unwrapped });
            return;
          }
          if (onEvent) onEvent({ type: "message", data: norm });
        };

        ws.onclose = function () {
          setReady(false);
          clearTimers();
          var attempt = (attempts.current = (attempts.current || 0) + 1);
          var delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
        };

        ws.onerror = function () {
          try { ws.close(); } catch (_) {}
        };
      } catch (_) {
        var attempt = (attempts.current = (attempts.current || 0) + 1);
        var delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
      }
    }

    connect();
    return function cleanup() { closeSocket(); };
  }, [threadId, enabled, onEvent, closeSocket, clearTimers]);

  const sendJson = useCallback(function (obj) {
    try {
      if (ready && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(obj));
        return true;
      }
    } catch (_) {}
    return false;
  }, [ready]);

  return { ready: ready, sendJson: sendJson };
}

export function useInboxSocket(options) {
  options = options || {};
  var currentUser    = options.currentUser;
  var onEvent        = options.onEvent;
  var enabled        = (typeof options.enabled === "boolean") ? options.enabled : true;
  var onFallbackTick = options.onFallbackTick;

  const wsRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const timers = useRef({ heartbeat: null, reconnect: null, poll: null });
  const attempts = useRef(0);

  const clearTimers = useCallback(function () {
    clearTimer(timers, "heartbeat", true);
    clearTimer(timers, "reconnect", false);
    clearTimer(timers, "poll", true);
  }, []);

  useEffect(function () {
    if (!enabled || !currentUser) {
      try { if (wsRef.current && typeof wsRef.current.close === "function") wsRef.current.close(1000, "inbox-off"); } catch (_) {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
      return;
    }

    var token = getCookie("access_token");
    var httpBase = (axiosInstance && axiosInstance.defaults && axiosInstance.defaults.baseURL) ? axiosInstance.defaults.baseURL : "";
    var url = makeInboxWsUrl(httpBase, token);

    function startPollingFallback() {
      if (timers.current && !timers.current.poll) {
        timers.current.poll = setInterval(function () {
          try { if (typeof onFallbackTick === "function") onFallbackTick(); } catch (_) {}
        }, 2000);
      }
    }

    function connect() {
      if (!hasWS()) { setReady(false); startPollingFallback(); return; }

      try {
        var ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = function () {
          setReady(true);
          attempts.current = 0;
          clearTimers();

          var uid = String(currentUser);
          var joinMsgs = [
            { type: "subscribe_user", user: uid },
            { type: "join", scope: "user", user: uid },
            { event: "subscribe", payload: { scope: "user", user: uid } },
            { action: "subscribe_all" }
          ];
          for (var i = 0; i < joinMsgs.length; i++) {
            try { ws.send(JSON.stringify(joinMsgs[i])); } catch (_) {}
          }

          timers.current.heartbeat = setInterval(function () {
            try { ws.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch (_) {}
          }, 25000);
        };

        ws.onmessage = function (ev) {
          var payload = ev && ev.data ? ev.data : null;
          var unwrapped = unwrapWsEvent(payload);
          var typeRaw = (unwrapped && (unwrapped.type || unwrapped.event)) ? (unwrapped.type || unwrapped.event) : "";
          var t = String(typeRaw).toLowerCase();

          if (t.indexOf("read") !== -1)  { if (onEvent) onEvent({ kind: "read", data: unwrapped }); return; }
          if (t.indexOf("typing") !== -1){ if (onEvent) onEvent({ kind: "typing", data: unwrapped }); return; }
          if (t.indexOf("message") !== -1) {
            var norm = normalizeMessage(unwrapped);
            if (norm && norm.thread_id) { if (onEvent) onEvent({ kind: "message", data: norm }); }
          }
        };

        ws.onclose = function () {
          setReady(false);
          clearTimers();
          var attempt = (attempts.current = (attempts.current || 0) + 1);
          var delay = Math.min(30000, 1000 * Math.pow(2, attempt));
          timers.current.reconnect = setTimeout(connect, delay);
          startPollingFallback();
        };

        ws.onerror = function () {
          try { ws.close(); } catch (_) {}
        };
      } catch (_) {
        var attempt = (attempts.current = (attempts.current || 0) + 1);
        var delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        timers.current.reconnect = setTimeout(connect, delay);
        startPollingFallback();
      }
    }

    connect();
    return function cleanup() {
      try { if (wsRef.current && typeof wsRef.current.close === "function") wsRef.current.close(1000, "inbox-unmount"); } catch (_) {}
      wsRef.current = null;
      setReady(false);
      clearTimers();
    };
  }, [enabled, currentUser, onEvent, onFallbackTick, clearTimers]);

  return { inboxReady: ready };
}
