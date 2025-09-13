// src/components/chat/ChatHeader.jsx
"use client";
import React from "react";
import { MoreVertical } from "lucide-react";
import { Avatar } from "./atoms";

export default function ChatHeader({ selected, typing }) {
  return (
    <div className="bg-white px-5 py-3 border-b border-gray-300 sticky top-0 z-10">
      {selected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar name={selected.name} id={String(selected.id)} size="lg" />
            <div className="ml-3">
              <h2 className="text-[15px] font-semibold text-[#464646]">{selected.name || "Direct Chat"}</h2>
              <p className="text-[13px] text-[#989898]">
                {selected.type === "GROUP" ? "Group" : typing ? "typing…" : "Online"}
              </p>
            </div>
          </div>
          {selected.type === "GROUP" && (
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Group options">
              <MoreVertical size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="text-[15px] text-[#464646]">Select a conversation</div>
      )}
    </div>
  );
}
