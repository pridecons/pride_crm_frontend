// src/components/chat/MessageList.jsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DayDivider, MessageBubble } from "./atoms";
import { compareMsgId, isSameDay, toLocal } from "./utils";

export default function MessageList({
    selected,
    messages,
    currentUser,
    readUpToByOthers,
    firstUnreadIdx,
    setFirstUnreadIdx,
    openDoc,
}) {
    const listRef = useRef(null);
    const bottomRef = useRef(null);
    const [showJump, setShowJump] = useState(false);

    // detect scrolled-up to toggle jump (optional)
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const onScroll = () => setShowJump(el.scrollTop + el.clientHeight < el.scrollHeight - 400);
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!selected) return;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }, [selected?.id]);

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
                msg: { ...msg, _onOpenAttachment: (url, title) => openDoc(url, title) },
            });
            lastSender = msg.sender_id;
        });
        return result;
    }, [messages, currentUser, readUpToByOthers, openDoc]);

    return (
        <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
            style={{
                backgroundImage: "radial-gradient(#0000000a 1px, transparent 1px)",
                backgroundSize: "18px 18px",
                backgroundPosition: "-9px -9px",
            }}
        >
            {selected ? (
                <div className="space-y-1">
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
                    <div ref={bottomRef} />
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
    );
}
