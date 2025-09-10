"use client";

import React, { useEffect, useRef, useState } from "react";
import { axiosInstance } from "@/api/Axios";

// helpers
function clsx(...x) { return x.filter(Boolean).join(" "); }
function prettyDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

export default function ChatPage() {
  const [loading, setLoading] = useState(false);

  // thread list
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);

  // messages
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [beforeId, setBeforeId] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // composer
  const [text, setText] = useState("");
  const composerRef = useRef(null);

  // create direct
  const [peerCode, setPeerCode] = useState("");

  // create group
  const [gName, setGName] = useState("");
  const [gParticipants, setGParticipants] = useState("");
  const [gBranchId, setGBranchId] = useState("");

  // participants mgmt
  const [addCodes, setAddCodes] = useState("");
  const [removeCodes, setRemoveCodes] = useState("");

  // Poll threads every 8s
  useEffect(() => {
    let alive = true;

    const loadThreads = async () => {
      try {
        const { data } = await axiosInstance.get("/chat/threads");
        if (alive) setThreads(data || []);
      } catch (e) {
        console.error("threads load error", e);
      }
    };

    loadThreads();
    const t = setInterval(loadThreads, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // when selecting a thread, load messages
  useEffect(() => {
    if (!selected) return;
    setBeforeId(null);
    refreshMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function refreshMessages(paginateOlder = false) {
    if (!selected) return;
    setMessagesLoading(true);
    try {
      const params = { limit: 50 };
      if (paginateOlder && (beforeId || messages[0])) {
        params.before_id = beforeId || messages[0]?.id;
      }

      const { data } = await axiosInstance.get(
        `/chat/${selected.id}/messages`,
        { params }
      );

      const list = Array.isArray(data) ? data : [];

      if (paginateOlder) {
        setMessages((prev) => [...list, ...prev]);
      } else {
        setMessages(list);
      }
      setHasMore(list.length === 50);
      if (list.length) setBeforeId(list[0].id);

      // mark read (best-effort)
      if (list.length) {
        const lastId = list[list.length - 1].id;
        axiosInstance.post(
          `/chat/${selected.id}/mark-read`,
          null,
          { params: { last_message_id: lastId } }
        ).catch(() => {});
      }
    } catch (e) {
      console.error("messages load error", e);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendMessage() {
    if (!selected || !text.trim()) return;
    const body = text.trim();
    setText("");
    composerRef.current?.focus();

    try {
      const { data } = await axiosInstance.post(
        `/chat/${selected.id}/send`,
        { body }
      );
      setMessages((prev) => [...prev, data]);
    } catch (e) {
      console.error("send error", e);
    }
  }

  async function createDirect() {
    if (!peerCode.trim()) return;
    setLoading(true);
    try {
      const { data: t } = await axiosInstance.post(
        "/chat/direct/create",
        { peer_employee_code: peerCode.trim() }
      );
      setThreads((prev) => (prev.find((x) => x.id === t.id) ? prev : [t, ...prev]));
      setSelected(t);
      setPeerCode("");
    } catch (e) {
      console.error("create direct error", e);
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!gName.trim()) return;
    const participant_codes = gParticipants.split(",").map(s => s.trim()).filter(Boolean);
    const branch_id = gBranchId.trim() ? Number(gBranchId.trim()) : undefined;

    setLoading(true);
    try {
      const { data: t } = await axiosInstance.post(
        "/chat/group/create",
        { name: gName.trim(), participant_codes, branch_id }
      );
      setThreads((prev) => [t, ...prev]);
      setSelected(t);
      setGName(""); setGParticipants(""); setGBranchId("");
    } catch (e) {
      console.error("create group error", e);
    } finally {
      setLoading(false);
    }
  }

  async function addParticipants() {
    if (!selected) return;
    const codes = addCodes.split(",").map(s => s.trim()).filter(Boolean);
    if (!codes.length) return;
    try {
      await axiosInstance.post(
        `/chat/${selected.id}/participants/add`,
        codes
      );
      setAddCodes("");
    } catch (e) {
      console.error("add participants error", e);
    }
  }

  async function removeParticipants() {
    if (!selected) return;
    const codes = removeCodes.split(",").map(s => s.trim()).filter(Boolean);
    if (!codes.length) return;
    try {
      await axiosInstance.post(
        `/chat/${selected.id}/participants/remove`,
        codes
      );
      setRemoveCodes("");
    } catch (e) {
      console.error("remove participants error", e);
    }
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] w-full gap-4 p-4">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Chat</h2>

        {/* Threads */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-500">Threads</div>
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border">
            {threads.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">No threads</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm hover:bg-gray-50",
                    selected?.id === t.id && "bg-gray-100"
                  )}
                >
                  <div>
                    <div className="font-medium">
                      {t.type === "DIRECT" ? "Direct chat" : t.name || `Group #${t.id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.type} {t.branch_id ? `• Branch ${t.branch_id}` : ""}
                    </div>
                  </div>
                  <div className="text-[10px] rounded-full bg-gray-200 px-2 py-0.5">#{t.id}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Direct create */}
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm font-semibold">New Direct</div>
          <input
            className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Peer EMP code"
            value={peerCode}
            onChange={(e) => setPeerCode(e.target.value)}
          />
          <button
            onClick={createDirect}
            disabled={!peerCode.trim() || loading}
            className="w-full rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Create Direct
          </button>
        </div>

        {/* Group create */}
        <div className="mt-4 rounded-2xl border p-3">
          <div className="mb-2 text-sm font-semibold">New Group</div>
          <input
            className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Group name"
            value={gName}
            onChange={(e) => setGName(e.target.value)}
          />
          <input
            className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Participants (EMP001,EMP002)"
            value={gParticipants}
            onChange={(e) => setGParticipants(e.target.value)}
          />
          <input
            className="mb-2 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Branch ID (optional)"
            value={gBranchId}
            onChange={(e) => setGBranchId(e.target.value)}
          />
          <button
            onClick={createGroup}
            disabled={!gName.trim() || loading}
            className="w-full rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Create Group
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col rounded-2xl border bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-base font-semibold">
              {selected
                ? selected.type === "DIRECT"
                  ? `Direct #${selected.id}`
                  : selected.name || `Group #${selected.id}`
                : "Select a thread"}
            </div>
            {selected?.branch_id ? (
              <div className="text-xs text-gray-500">Branch {selected.branch_id}</div>
            ) : null}
          </div>

          {selected?.type === "GROUP" && (
            <div className="flex items-center gap-2">
              <input
                className="w-48 rounded-xl border px-3 py-2 text-sm"
                placeholder="Add EMP codes"
                value={addCodes}
                onChange={(e) => setAddCodes(e.target.value)}
              />
              <button
                onClick={addParticipants}
                disabled={!addCodes.trim()}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs text-white"
              >
                Add
              </button>

              <input
                className="w-48 rounded-xl border px-3 py-2 text-sm"
                placeholder="Remove EMP codes"
                value={removeCodes}
                onChange={(e) => setRemoveCodes(e.target.value)}
              />
              <button
                onClick={removeParticipants}
                disabled={!removeCodes.trim()}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs text-white"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {selected && (
              <div className="mx-auto max-w-3xl">
                {hasMore && (
                  <div className="mb-3 flex justify-center">
                    <button
                      onClick={() => refreshMessages(true)}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50"
                    >
                      Load older…
                    </button>
                  </div>
                )}
                {messagesLoading && messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No messages</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="mb-3 w-full rounded-2xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-700">{m.sender_id || "System"}</div>
                        <div className="text-[11px] text-gray-400">{prettyDate(m.created_at)}</div>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
                    </div>
                  ))
                )}
              </div>
            )}
            {!selected && (
              <div className="py-12 text-center text-sm text-gray-500">Choose a thread to start chatting.</div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <textarea
                ref={composerRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={selected ? "Type a message…" : "Select a thread first"}
                disabled={!selected}
                rows={1}
                className="min-h-[42px] flex-1 resize-none rounded-2xl border px-3 py-2 text-sm disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!selected || !text.trim()}
                className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
