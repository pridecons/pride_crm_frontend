// src/components/chat/ThreadList.jsx
"use client";
import React, { useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { Avatar } from "./atoms";
import { clsx, humanTime } from "./utils";

export default function ThreadList({
  threads,
  users,
  selectedId,
  onSelectThread,
  onSelectUserAsPending,
  searchQuery,
  setSearchQuery,
  onOpenNewChat,
}) {
  const q = (searchQuery || "").toLowerCase();

  const filteredThreads = useMemo(() => {
    if (!q) return threads;
    return threads.filter((t) => (t.name || "Direct Chat").toLowerCase().includes(q));
  }, [threads, q]);

  const filteredUsers = useMemo(() => {
    if (!q) return [];
    return users.filter((u) =>
      (u.full_name || u.name || u.employee_code || "").toLowerCase().includes(q)
    );
  }, [users, q]);

  return (
    <div
      className="shrink-0 border-r border-gray-200 bg-[#f8fafc] flex flex-col overflow-hidden min-h-0"
      style={{ width: "315px" }}   // ⬅️ reduced width (fixed, clean)
    >
      {/* Sticky head */}
      <div className="sticky top-0 z-10 bg-[#f8fafc] border-b border-gray-200 px-5 py-3">
        <div className="flex items-center">
          <h4 className="text-[#0f766e] text-[20px] font-semibold flex-1">Recent Chats</h4>
          <button
            onClick={onOpenNewChat}
            className="ml-3 inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-200 text-gray-700"
            title="New Group"
            aria-label="New Group"
          >
            <Plus size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-white/80 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-sm"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Inbox list */}
      <div className="flex-1 overflow-y-auto">
        {q ? (
          <>
            {filteredThreads.map((thread) => (
              <button
                key={`thread-${thread.id}`}
                onClick={() => onSelectThread(thread)}
                className={clsx(
                  "w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-100/80",
                  selectedId === thread.id && "bg-gray-100"
                )}
              >
                <div className="flex">
                  <div className="w-[44px] pt-1">
                    <Avatar name={thread.name} id={String(thread.id)} size="lg" />
                  </div>
                  <div className="pl-4 min-w-0 flex-1">
                    <h5 className="text-[15px] text-[#374151] font-semibold mb-1 truncate">
                      {thread.name || "Direct Chat"}
                      <span className="float-right text-[12px] text-gray-500 font-normal">
                        {humanTime(thread.last_message_time)}
                      </span>
                    </h5>
                    <p className="text-[13px] text-[#6b7280] truncate">
                      {thread.last_message || " "}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.map((user) => (
              <button
                key={`user-${user.employee_code}`}
                onClick={() => onSelectUserAsPending(user)}
                className="w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-100/80"
              >
                <div className="flex">
                  <div className="w-[44px] pt-1">
                    <Avatar name={user.full_name || user.name} id={user.employee_code} size="lg" />
                  </div>
                  <div className="pl-4 min-w-0 flex-1">
                    <h5 className="text-[15px] text-[#374151] font-semibold mb-1 truncate">
                      {user.full_name || user.name}
                    </h5>
                    <p className="text-[13px] text-[#6b7280] truncate">{user.employee_code}</p>
                  </div>
                </div>
              </button>
            ))}
          </>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              className={clsx(
                "w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-100/80",
                selectedId === thread.id && "bg-gray-100"
              )}
            >
              <div className="flex">
                <div className="w-[44px] pt-1">
                  <Avatar name={thread.name} id={String(thread.id)} size="lg" />
                </div>
                <div className="pl-4 min-w-0 flex-1">
                  <h5 className="text-[15px] text-[#374151] font-semibold mb-1 truncate">
                    {thread.name || "Direct Chat"}
                    <span className="float-right text-[12px] text-gray-500 font-normal">
                      {humanTime(thread.last_message_time)}
                    </span>
                  </h5>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] text-[#6b7280] truncate">{thread.last_message || " "}</p>
                    {!!thread.unread_count && (
                      <span className="ml-2 bg-teal-600 text-white text-[11px] rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
