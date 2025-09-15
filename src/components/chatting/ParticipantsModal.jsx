// src/components/chat/ParticipantsModal.jsx
"use client";
import React from "react";
import { X } from "lucide-react";
import { Avatar } from "./atoms";

export default function ParticipantsModal({ open, onClose, participants = [] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-base font-semibold">Group participants</h3>
          <button className="p-1.5 rounded hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {participants.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No participants found.</div>
          ) : (
            participants.map((p, i) => (
              <div key={p.employee_code || p.id || i} className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3">
                <Avatar name={p.full_name || p.name || p.employee_code} id={p.employee_code || p.id} size="lg" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.full_name || p.name || p.employee_code}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {(p.employee_code || "").toString()}
                    {p.branch_name ? ` • ${p.branch_name}` : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
