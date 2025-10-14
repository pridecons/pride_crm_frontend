"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { axiosInstance, BASE_URL_full } from "@/api/Axios";
import { useDocViewer } from "@/helper/useDocViewer";
import { useTheme } from "@/context/ThemeContext";

// chat modules
import { useEmployeeCode, useChatSocket, useInboxSocket } from "@/components/chatting/hooks";
import { compareMsgId, normalizeMessage, clsx } from "@/components/chatting/utils";
import ThreadList from "@/components/chatting/ThreadList";
import ChatHeader from "@/components/chatting/ChatHeader";
import MessageList from "@/components/chatting/MessageList";
import NewChatModal from "@/components/chatting/NewChatModal";
import Composer from "@/components/chatting/Composer";
import ParticipantsModal from "@/components/chatting/ParticipantsModal";

/* ---------------------------- Thread normalizers ---------------------------- */
function normalizeThread(t = {}) {
  const lm = t.last_message || null;
  const last_message = typeof lm === "string" ? lm : (lm?.body ?? "");
  const last_message_time =
    typeof lm === "string" ? (t.last_message_time ?? null) : (lm?.created_at ?? null);
  const last_message_id =
    typeof lm === "string" ? (t.last_message_id ?? null) : (lm?.id ?? null);

  let unseen = t.unseen_count;
  if (typeof unseen === "string") unseen = parseInt(unseen, 10);
  if (!Number.isFinite(unseen) || unseen < 0) unseen = 0;

  return { ...t, last_message, last_message_time, last_message_id, unseen_count: unseen };
}
function normalizeThreads(arr = [], prev = []) {
  const prevById = new Map(prev.map((x) => [x.id, x]));
  return arr.map((raw) => {
    const merged = { ...(prevById.get(raw.id) || {}), ...raw };
    return normalizeThread(merged);
  });
}

/* --------------------------------- API helpers -------------------------------- */
async function createGroup({ name, participant_codes }) {
  const { data } = await axiosInstance.post("/chat/group/create", {
    name,
    participant_codes,
  });
  return data;
}
async function renameGroup(groupId, name) {
  const { data } = await axiosInstance.patch(`/chat/group/${groupId}/edit`, { name });
  return data;
}
async function addGroupParticipants(groupId, employeeCodes) {
  const { data } = await axiosInstance.post(`/chat/${groupId}/participants/add`, employeeCodes);
  return data;
}
async function removeGroupParticipants(groupId, employeeCodes) {
  const { data } = await axiosInstance.post(`/chat/${groupId}/participants/remove`, employeeCodes);
  return data;
}

export default function WhatsAppChatPage() {
  const { themeConfig } = useTheme();

  const { openDoc, DocViewerPortal } = useDocViewer({
    defaultTitle: "Attachment",
    canDownload: true,
    baseUrl: BASE_URL_full,
  });
  const currentUser = useEmployeeCode();

  // Core data
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const selectedId = selected?.id ?? null;
  const [messages, setMessages] = useState([]);

  // Directory
  const [users, setUsers] = useState([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  // Read receipts + typing
  const [readUpToByOthers, setReadUpToByOthers] = useState(() => new Map());
  const [typing, setTyping] = useState(false);

  // Unread divider index
  const [firstUnreadIdx, setFirstUnreadIdx] = useState(null);

  const [showParticipants, setShowParticipants] = useState(false);

  // Throttled peeking
  const peekCooldownMs = 10_000;
  const lastPeekAtRef = useRef(new Map());
  const inFlightRef = useRef(new Set());

  // Dedup recent optimistic sends
  const recentSentRef = useRef(new Set());
  function msgKey(sender, threadId, body) {
    return `${sender || ""}|${threadId || ""}|${(body || "").slice(0, 500)}`;
  }
  const rememberSent = useCallback((sender, threadId, body, ttlMs = 5000) => {
    const k = msgKey(sender, threadId, body);
    recentSentRef.current.add(k);
    setTimeout(() => recentSentRef.current.delete(k), ttlMs);
  }, []);

  // Drag & paste to Composer
  const composerRef = useRef(null);

  /* ------------------------------- Read receipts (self) ------------------------------- */
  const lastMarkedReadIdRef = useRef(new Map());
  const markRead = useCallback(async (threadId, lastMessageId) => {
    if (!threadId || lastMessageId == null) return;
    const key = String(threadId);
    const prev = lastMarkedReadIdRef.current.get(key);
    if (prev && compareMsgId(lastMessageId, prev) <= 0) return;

    lastMarkedReadIdRef.current.set(key, lastMessageId);
    try {
      await axiosInstance.post(`/chat/${threadId}/mark-read`, null, {
        params: { last_message_id: lastMessageId },
      });
    } catch (_) {
      const cur = lastMarkedReadIdRef.current.get(key);
      if (cur === lastMessageId) lastMarkedReadIdRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/users/", {
          params: { skip: 0, limit: 200, active_only: true },
        });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const normalized = list.map((u) => ({
          employee_code: u.employee_code || u.code || u.id || "",
          full_name: u.full_name || u.name || u.username || "",
          ...u,
        }));
        if (alive) setUsers(normalized);
      } catch (e) {
        console.error("users load error", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------------- Config toggles ------------------------------- */
  const USE_WS_ONLY = true;
  const INITIAL_THREADS_FETCH = true;

  /* ------------------------------- One-time load ------------------------------- */
  useEffect(() => {
    if (!INITIAL_THREADS_FETCH) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/chat/threads");
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setThreads((prev) => normalizeThreads(arr, prev));
      } catch (e) {
        console.error("initial threads load error", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------- No polling when WS ------------------------------- */
  useEffect(() => {
    if (USE_WS_ONLY) return;
  }, []);

  /* ------------------------------- Load messages when selecting ------------------------------- */
  useEffect(() => {
    if (!selected?.id) return;
    if (Array.isArray(selected.participants) && selected.participants.length) return;
    let alive = true;
    (async () => {
      try {
        const { data: t } = await axiosInstance.get(`/chat/threads/${selected.id}`);
        if (!alive || !t?.id) return;
        const nt = normalizeThread(t);
        setSelected((prev) => (prev?.id === t.id ? { ...prev, ...t } : prev));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    (async () => {
      try {
        const { data } = await axiosInstance.get(`/chat/${selected.id}/messages`, { params: { limit: 100 } });
        const list = Array.isArray(data) ? data : [];
        setMessages(list);

        const lastReadId = selected?.last_read_message_id_self;
        if (!lastReadId) {
          setFirstUnreadIdx(null);
        } else {
          const idx = list.findIndex((m) => compareMsgId(m.id, lastReadId) > 0);
          setFirstUnreadIdx(idx >= 0 ? idx : null);
        }

        if (list.length) {
          const lastId = list[list.length - 1].id;
          await markRead(selected.id, lastId);
          await fallbackTick();
        }
      } catch (e) {
        console.error("messages load error", e);
      }
    })();
  }, [selected?.id, markRead]);

  /* ------------------------------- Inbox-wide events ------------------------------- */
  const handleInboxEvent = useCallback(
    (evt) => {
      if (!evt) return;

      if (evt.kind === "read") {
        const tid = evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
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

      if (evt.kind === "typing") {
        const tid = evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const who = evt.data.user || evt.data.sender_id || evt.data.senderId;
        if (tid && tid === selected?.id && String(who) !== String(currentUser)) {
          setTyping(true);
          clearTimeout(window.__typingTimer);
          window.__typingTimer = setTimeout(() => setTyping(false), 2500);
        }
        return;
      }

      if (evt.kind === "message" && evt.data) {
        const m = evt.data;
        const tId = m.thread_id;

        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === tId);
          if (idx === -1) {
            const placeholder = {
              id: tId,
              name: m.thread_name || "Direct Chat",
              type: m.thread_type || "DIRECT",
              last_message: m.body,
              last_message_time: m.created_at,
            };
            return [placeholder, ...prev];
          }
          return prev.map((t) =>
            t.id === tId ? { ...t, last_message: m.body, last_message_time: m.created_at } : t
          );
        });
        fallbackTick();

        (async () => {
          try {
            const { data: t } = await axiosInstance.get(`/chat/threads/${tId}`);
            if (!t?.id) return;
            setThreads((prev) =>
              prev.some((x) => x.id === tId) ? prev.map((x) => (x.id === tId ? { ...x, ...t } : x)) : [t, ...prev]
            );
          } catch {}
        })();
      }
    },
    [currentUser, selected?.id]
  );

  /* ------------------------------- Merge helpers ------------------------------- */
  const mergeThread = useCallback((fresh) => {
    if (!fresh?.id) return;
    setThreads((prev) =>
      prev.some((t) => t.id === fresh.id) ? prev.map((t) => (t.id === fresh.id ? { ...t, ...fresh } : t)) : [fresh, ...prev]
    );
    setSelected((prev) => (prev?.id === fresh.id ? { ...prev, ...fresh } : prev));
  }, []);

  const [participantOpsBusy, setParticipantOpsBusy] = useState(false);

  const handleRenameGroup = useCallback(async (newName) => {
    if (!selected?.id || selected?.type !== "GROUP") return;
    try {
      const t = await renameGroup(selected.id, newName);
      mergeThread(t);
    } catch (e) {
      console.error("rename group error", e);
    }
  }, [selected?.id, selected?.type, mergeThread]);

  const handleAddParticipants = useCallback(
    async (codes) => {
      if (!selected?.id || selected?.type !== "GROUP" || !codes?.length) return;
      setParticipantOpsBusy(true);
      try {
        const res = await addGroupParticipants(selected.id, codes);
        if (res?.id) {
          mergeThread(res);
        } else {
          const { data: t } = await axiosInstance.get(`/chat/threads/${selected.id}`);
          if (t?.id) mergeThread(t);
        }
      } catch (e) {
        console.error("add participants error", e);
      } finally {
        setParticipantOpsBusy(false);
      }
    },
    [selected?.id, selected?.type, mergeThread]
  );

  const handleRemoveParticipants = useCallback(
    async (codes) => {
      if (!selected?.id || selected?.type !== "GROUP" || !codes?.length) return;
      setParticipantOpsBusy(true);
      try {
        const res = await removeGroupParticipants(selected.id, codes);
        if (res?.id) {
          mergeThread(res);
        } else {
          const { data: t } = await axiosInstance.get(`/chat/threads/${selected.id}`);
          if (t?.id) mergeThread(t);
        }
      } catch (e) {
        console.error("remove participants error", e);
      } finally {
        setParticipantOpsBusy(false);
      }
    },
    [selected?.id, selected?.type, mergeThread]
  );

  const fallbackTick = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/chat/threads");
      const arr = Array.isArray(data) ? data : [];
      setThreads((prev) => normalizeThreads(arr, prev));
    } catch {}
  }, []);

  useInboxSocket({ currentUser, enabled: !!currentUser, onEvent: handleInboxEvent });

  /* ------------------------------- Thread socket events (room) ------------------------------- */
  const handleSocketEvent = useCallback(
    (evt) => {
      if (!evt) return;
      const m = evt.data;
      const isSelf = String(m.sender_id) === String(currentUser);

      if (evt.type === "read" && !isSelf) {
        const tid = evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const lr = evt.data.last_read_id || evt.data.lastReadId || evt.data.last_read_message_id;
        if (tid && lr != null && tid === selected?.id) {
          setReadUpToByOthers((prev) => {
            const map = new Map(prev);
            map.set(String(tid), lr);
            return map;
          });
          setMessages((prev) =>
            prev.map((mm) =>
              mm.sender_id === currentUser && compareMsgId(mm.id, lr) <= 0 ? { ...mm, _status: "read" } : mm
            )
          );
        }
        return;
      }
      if (evt.type === "typing" && !isSelf) {
        const tid = evt.data.thread_id || evt.data.threadId || evt.data.room_id || evt.data.roomId;
        const who = evt.data.user || evt.data.sender_id || evt.data.senderId;
        if (tid && tid === selected?.id && String(who) !== String(currentUser)) {
          setTyping(true);
          clearTimeout(window.__typingTimer);
          window.__typingTimer = setTimeout(() => setTyping(false), 2500);
        }
        return;
      }

      if (evt.type === "message" && evt.data) {
        const msg = normalizeMessage(evt.data);
        if (!msg || !msg.thread_id) return;
        const tId = msg.thread_id;
        const mine = String(msg.sender_id) === String(currentUser);

        const echoKey = `${currentUser || ""}|${tId || ""}|${(msg.body || "").slice(0, 500)}`;
        if (recentSentRef.current.has(echoKey)) return;

        if (mine) {
          setThreads((prev) =>
            prev.map((t) => (t.id === tId ? { ...t, last_message: msg.body, last_message_time: msg.created_at } : t))
          );
          if (tId === selectedId) {
            setMessages((prev) =>
              msg.id && prev.some((x) => x.id === msg.id) ? prev : [...prev, { ...msg, _status: "delivered" }]
            );
          }
          return;
        }

        if (tId === selectedId) {
          setMessages((prev) => (msg.id && prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
          setThreads((prev) =>
            prev.map((t) =>
              t.id === tId
                ? { ...t, last_message: msg.body, last_message_time: msg.created_at, unread_count: 0 }
                : t
            )
          );
          if (msg.id) {
            markRead(tId, msg.id);
          }
        } else {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === tId
                ? {
                    ...t,
                    last_message: msg.body,
                    last_message_time: msg.created_at,
                    unread_count: (t.unread_count || 0) + 1,
                  }
                : t
            )
          );
        }
      }
    },
    [selected?.id, selectedId, currentUser, markRead]
  );

  const { ready: wsReady } = useChatSocket({
    threadId: selected?.id,
    enabled: !!selected?.id,
    onEvent: handleSocketEvent,
  });

  /* ------------------------------- Send message ------------------------------- */
  const postMessageFormData = async (threadId, body, files) => {
    const fd = new FormData();
    fd.append("body", body || "");
    (files || []).forEach((f) => fd.append("files", f));
    const { data } = await axiosInstance.post(`/chat/${threadId}/send`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  };

  const isPendingThread = (t) => !!t && !t.id && t.pending === true;

  const handleSend = async (body, files) => {
    if ((!body && (!files || files.length === 0)) || !selected) return false;

    rememberSent(currentUser, selected.id, body || "");

    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        thread_id: selected.id,
        sender_id: currentUser,
        body,
        created_at: new Date().toISOString(),
        attachments: (files || []).map((f, i) => ({
          id: `tmp-${f.name}-${i}`,
          filename: f.name,
          mime_type: f.type || "application/octet-stream",
          size_bytes: f.size || 0,
          url: "",
        })),
        _status: "sending",
      },
    ]);

    try {
      if (isPendingThread(selected)) {
        const peerCode = selected?.peer?.employee_code;
        rememberSent(currentUser, selected.id, body);

        const { data: t } = await axiosInstance.post("/chat/direct/create", {
          peer_employee_code: peerCode,
        });

        const sentMsg = await postMessageFormData(t.id, body, files);
        setThreads((prev) => (prev.find((x) => x.id === t.id) ? prev : [t, ...prev]));
        setSelected(t);
        setMessages((prev) => prev.filter((m) => m.id !== tempId).concat([{ ...sentMsg, _status: "delivered" }]));
        setThreads((prev) =>
          prev.map((th) => (th.id === t.id ? { ...th, last_message: sentMsg.body, last_message_time: sentMsg.created_at } : th))
        );
        try {
          await markRead(t.id, sentMsg.id);
          await fallbackTick();
        } catch {}
        return true;
      }

      const sentMsg = await postMessageFormData(selected.id, body, files);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...sentMsg, _status: "delivered" } : m)));
      setThreads((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, last_message: sentMsg.body, last_message_time: sentMsg.created_at } : t))
      );
      try {
        await markRead(selected.id, sentMsg.id);
        await fallbackTick();
      } catch {}
      return true;
    } catch (e) {
      console.error("send error", e);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _status: "failed" } : m)));
      return false;
    }
  };

  /* ------------------------------- Pending-thread select ------------------------------- */
  const selectUserAsPending = (user) => {
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
  };

  /* ------------------------------- THEMED LAYOUT ------------------------------- */
  const pageBg = `var(--theme-background-gradient, var(--theme-background))`;

  return (
    <div
      className="fixed top-16 right-0 bottom-0 overflow-hidden"
      style={{
        left: "var(--sbw)",
        transition: "left 200ms ease",
        background: pageBg,
        color: "var(--theme-text)",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer?.files?.length) composerRef.current?.addFiles(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        const items = e.clipboardData?.items || [];
        const files = [];
        for (const it of items) if (it.kind === "file") { const f = it.getAsFile(); if (f) files.push(f); }
        if (files.length) composerRef.current?.addFiles(files);
      }}
    >
      <div className="h-full">
        <div
          className="h-full border rounded-lg"
          style={{
            borderColor: "var(--theme-border)",
            background: "color-mix(in oklab, var(--theme-surface) 80%, transparent)",
            boxShadow: `0 10px 25px ${themeConfig.shadow}`,
          }}
        >
          <div className="flex h-full min-h-0">
            {/* LEFT */}
            <ThreadList
              threads={threads}
              users={users}
              selectedId={selectedId}
              onSelectThread={(t) => setSelected(t)}
              onSelectUserAsPending={selectUserAsPending}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenNewChat={() => setShowNewChat(true)}
            />

            {/* RIGHT */}
            <div className="flex-1 flex flex-col min-h-0">
              <ChatHeader
                selected={selected}
                typing={typing}
                onShowParticipants={async () => {
                  if (selected?.id && !Array.isArray(selected.participants)) {
                    try {
                      const { data: t } = await axiosInstance.get(`/chat/threads/${selected.id}`);
                      if (t?.id) setSelected((prev) => (prev?.id === t.id ? { ...prev, ...t } : prev));
                    } catch {}
                  }
                  setShowParticipants(true);
                }}
              />

              <MessageList
                selected={selected}
                messages={messages}
                currentUser={currentUser}
                readUpToByOthers={readUpToByOthers}
                firstUnreadIdx={firstUnreadIdx}
                setFirstUnreadIdx={setFirstUnreadIdx}
                openDoc={openDoc}
                onReachBottom={(lastIncomingId) => {
                  if (selected?.id && lastIncomingId) markRead(selected.id, lastIncomingId);
                }}
              />

              {selected && <Composer ref={composerRef} disabled={!selected} onSend={handleSend} />}
            </div>
          </div>
        </div>
      </div>

      <ParticipantsModal
        open={showParticipants && selected?.type === "GROUP"}
        onClose={() => setShowParticipants(false)}
        participants={Array.isArray(selected?.participants) ? selected.participants : []}
        allUsers={users}
        busy={participantOpsBusy}
        onAdd={(codes) => handleAddParticipants(codes)}
        onRemove={(codes) => handleRemoveParticipants(codes)}
        onRename={(newName) => handleRenameGroup(newName)}
        groupName={selected?.name || ""}
      />

      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        users={users}
        onCreateGroup={async (name, usersArr) => {
          try {
            const participant_codes = usersArr.map((u) => u.employee_code);
            const t = await createGroup({ name, participant_codes });
            setThreads((prev) => [t, ...prev]);
            setSelected(t);
            setMessages([]);
          } catch (e) {
            console.error("create group error", e);
          }
        }}
      />

      {/* Doc viewer portal will inherit themed backdrop if your hook uses CSS vars */}
      {DocViewerPortal}
    </div>
  );
}
