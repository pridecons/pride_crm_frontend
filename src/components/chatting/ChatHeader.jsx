// src/components/chat/ChatHeader.jsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Users } from "lucide-react";
import { Avatar } from "./atoms";

export default function ChatHeader({ selected, typing, onShowParticipants }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const participants = Array.isArray(selected?.participants) ? selected.participants : [];

  return (
    <div className="bg-white px-5 py-3 border-b border-gray-200 sticky top-0 z-10">
      {selected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <Avatar name={selected.name} id={String(selected.id || selected.peer?.employee_code)} size="lg" />
            <div className="ml-3 min-w-0">
              <h2 className="text-[15px] font-semibold text-[#374151] truncate">
                {selected.name || "Direct Chat"}
              </h2>

              {selected.type === "GROUP" ? (
                <div className="flex items-center gap-2 text-[12px] text-[#6b7280]">
                  <Users size={14} className="shrink-0" />
                  <div className="truncate">
                    {participants.length > 0 ? (
                      <>
                        {participants.slice(0, 4).map((p, i) => (
                          <span key={p.employee_code || p.id || i} className="after:content-['·'] after:mx-1 last:after:content-['']">
                            {p.full_name || p.name || p.employee_code}
                          </span>
                        ))}
                        {participants.length > 4 && (
                          <span className="ml-1 text-[#111827] font-medium">+{participants.length - 4} more</span>
                        )}
                      </>
                    ) : (
                      <span className="italic">No participants loaded</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#6b7280]">
                  {typing ? "typing…" : "Online"}
                </p>
              )}
            </div>
          </div>

          {selected.type === "GROUP" && (
            <div className="relative" ref={menuRef}>
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                title="More"
                aria-label="More"
                onClick={() => setOpen((v) => !v)}
              >
                <MoreVertical size={18} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setOpen(false);
                      onShowParticipants?.();
                    }}
                  >
                    <Users size={16} />
                    View participants
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[15px] text-[#374151]">Select a conversation</div>
      )}
    </div>
  );
}
