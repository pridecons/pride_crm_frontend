// src/components/chat/MessageList.jsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayDivider, MessageBubble } from "./atoms";
import { compareMsgId, isSameDay, toLocal } from "./utils";

export default function MessageList({
  selected,
  messages,
  currentUser,
  readUpToByOthers,
  firstUnreadIdx,
  setFirstUnreadIdx,
  openDoc, // keep: used for docs only
}) {
  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const [showJump, setShowJump] = useState(false);

  // image preview state
  const [imgPreview, setImgPreview] = useState(null); // {src, title}

  const scrollToBottom = useCallback((behavior = "smooth") => {
    try { bottomRef.current?.scrollIntoView({ behavior, block: "end" }); } catch {}
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setShowJump(el.scrollTop + el.clientHeight < el.scrollHeight - 400);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const id = requestAnimationFrame(() => scrollToBottom("smooth"));
    return () => cancelAnimationFrame(id);
  }, [selected?.id, scrollToBottom]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !messages?.length) return;
    const last = messages[messages.length - 1];
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 160;
    if (nearBottom || String(last?.sender_id) === String(currentUser)) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [messages?.length, currentUser, scrollToBottom]);

  const openAttachment = useCallback(
    (url, title, mime = "") => {
        if (!url || !String(url).trim()) return; // ← guard empty URL
      const m = (mime || "").toLowerCase();
      if (m.startsWith("image/")) {
        // open simple in-chat preview
        setImgPreview({ src: url, title: title || "Image" });
      } else {
        // use document viewer for everything else (pdf, docs, etc.)
        openDoc?.(url, title || "Attachment");
      }
    },
    [openDoc]
  );

  const rendered = useMemo(() => {
    const result = [];
    let lastDay = null;
    let lastSender = null;

    (messages || []).forEach((msg) => {
      if (msg.sender_id === currentUser) {
        if (!msg._status) {
          msg._status = String(msg.id).startsWith("tmp-") ? "sending" : "delivered";
        }
        const othersReadUpto = readUpToByOthers.get(String(msg.thread_id));
        if (othersReadUpto && compareMsgId(msg.id, othersReadUpto) <= 0) {
          msg._status = "read";
        }
      }

      const date = toLocal(msg.created_at);
      if (!lastDay || !isSameDay(date, lastDay)) {
        result.push({ type: "DAY", key: `day-${date.toDateString()}`, date });
        lastDay = date;
        lastSender = null;
      }
      const mine = msg.sender_id === currentUser;
      const showHeader = lastSender !== msg.sender_id;
      const showAvatar = !mine && showHeader;

      result.push({
        type: "MSG",
        key: `msg-${msg.id}`,
        mine,
        showHeader,
        showAvatar,
        msg: { ...msg, _onOpenAttachment: (url, title, mime) => openAttachment(url, title, mime) },
      });
      lastSender = msg.sender_id;
    });
    return result;
  }, [messages, currentUser, readUpToByOthers, openAttachment]);

  return (
    <>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 min-h-0 w-full"
        style={{
          backgroundImage: "radial-gradient(#0000000a 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "-9px -9px",
          maxWidth: "100%",
        }}
      >
        {selected ? (
          <div className="space-y-1 w-full max-w-full">
            {rendered.map((it, idx) => {
              const node =
                it.type === "DAY" ? (
                  <DayDivider key={it.key} date={it.date} />
                ) : (
                  <MessageBubble
                    key={it.key}
                    mine={it.mine}
                    msg={it.msg}
                    showHeader={it.showHeader}
                    showAvatar={it.showAvatar}
                  />
                );

              const isUnreadDivider =
                firstUnreadIdx != null && it.type === "MSG" && idx === firstUnreadIdx;

              return isUnreadDivider ? (
                <React.Fragment key={`wrap-${it.key}`}>
                  <div className="flex items-center my-3">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="mx-3 text-[11px] text-gray-600 bg-white px-2 py-0.5 rounded-full border">
                      Unread
                    </span>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>
                  {node}
                </React.Fragment>
              ) : (
                node
              );
            })}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <div className="text-6xl mb-3">💬</div>
              <div className="text-lg font-semibold">Welcome to Chat</div>
              <div className="text-sm">Select a conversation to start messaging</div>
            </div>
          </div>
        )}
      </div>

      {/* image preview overlay */}
      {imgPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setImgPreview(null)}
        >
          <img
            src={imgPreview.src}
            alt={imgPreview.title}
            className="max-w-[92vw] max-h-[88vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 px-3 py-1.5 rounded-lg text-sm shadow"
            onClick={() => setImgPreview(null)}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
