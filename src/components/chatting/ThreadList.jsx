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
    <div className="w-[40%] border-r border-gray-300 bg-[#f8f8f8] flex flex-col overflow-hidden min-h-0">
      {/* Sticky head */}
      <div className="sticky top-0 z-10 bg-[#f8f8f8] border-b border-gray-300 px-5 py-3">
        <div className="flex items-center">
          <h4 className="text-[#05728f] text-[21px] font-semibold flex-1">Recent</h4>
          <button
            onClick={onOpenNewChat}
            className="ml-3 inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-200 text-gray-700"
            title="New Group"
          >
            <Plus size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-transparent border-1 border-b border-blue-500 rounded-2xl focus:outline-none focus:border-gray-400 text-sm"
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
                  "w-full text-left px-4 py-3 border-b border-gray-300 hover:bg-gray-100",
                  selectedId === thread.id && "bg-gray-200"
                )}
              >
                <div className="flex">
                  <div className="w-[11%] pt-1">
                    <Avatar name={thread.name} id={String(thread.id)} size="lg" />
                  </div>
                  <div className="pl-4 w-[89%]">
                    <h5 className="text-[15px] text-[#464646] font-semibold mb-1">
                      {thread.name || "Direct Chat"}
                      <span className="float-right text-[13px] text-gray-500 font-normal">
                        {humanTime(thread.last_message_time)}
                      </span>
                    </h5>
                    <p className="text-[14px] text-[#989898] truncate">
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
                className="w-full text-left px-4 py-3 border-b border-gray-300 hover:bg-gray-100"
              >
                <div className="flex">
                  <div className="w-[11%] pt-1">
                    <Avatar name={user.full_name || user.name} id={user.employee_code} size="lg" />
                  </div>
                  <div className="pl-4 w-[89%]">
                    <h5 className="text-[15px] text-[#464646] font-semibold mb-1">
                      {user.full_name || user.name}
                    </h5>
                    <p className="text-[14px] text-[#989898] truncate">{user.employee_code}</p>
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
                "w-full text-left px-4 py-3 border-b border-gray-300 hover:bg-gray-100",
                selectedId === thread.id && "bg-gray-200"
              )}
            >
              <div className="flex">
                <div className="w-[11%] pt-1">
                  <Avatar name={thread.name} id={String(thread.id)} size="lg" />
                </div>
                <div className="pl-4 w-[89%]">
                  <h5 className="text-[15px] text-[#464646] font-semibold mb-1">
                    {thread.name || "Direct Chat"}
                    <span className="float-right text-[13px] text-gray-500 font-normal">
                      {humanTime(thread.last_message_time)}
                    </span>
                  </h5>
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] text-[#989898] truncate">{thread.last_message || " "}</p>
                    {!!thread.unread_count && (
                      <span className="ml-2 bg-[#05728f] text-white text-[11px] rounded-full min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center">
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
