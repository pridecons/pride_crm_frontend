"use client";
import React, { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Avatar } from "./atoms";

export default function ParticipantsModal({
  open,
  onClose,
  participants = [],
  allUsers = [],
  busy = false,
  onAdd,
  onRemove,
  onRename,
  groupName = "",
}) {
  const [name, setName] = useState(groupName);
  const [mode, setMode] = useState("add"); // add | remove
  const [selection, setSelection] = useState([]); // array of codes

  useEffect(() => setName(groupName || ""), [groupName]);

  const participantCodes = useMemo(
    () => new Set(participants.map((p) => p.employee_code || p.code || p.id)),
    [participants]
  );

  const list = useMemo(() => {
    if (mode === "add") {
      return allUsers.filter((u) => !participantCodes.has(u.employee_code));
    }
    return participants;
  }, [mode, allUsers, participants, participantCodes]);

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

        {/* rename */}
        <div className="px-4 pt-4">
          <label className="block text-sm text-gray-600 mb-1">Group name</label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
            />
            <button
              className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
              disabled={!name || name === groupName || busy}
              onClick={() => onRename?.(name)}
            >
              Rename
            </button>
          </div>
        </div>

        {/* add/remove switch */}
        <div className="px-4 pt-4">
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded-full text-sm ${mode === "add" ? "bg-black text-white" : "bg-gray-200"}`}
              onClick={() => { setMode("add"); setSelection([]); }}
            >
              Add
            </button>
            <button
              className={`px-3 py-1 rounded-full text-sm ${mode === "remove" ? "bg-black text-white" : "bg-gray-200"}`}
              onClick={() => { setMode("remove"); setSelection([]); }}
            >
              Remove
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto mt-3 border-t">
          {list.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No users.</div>
          ) : (
            list.map((u, i) => {
              const code = u.employee_code || u.code || u.id;
              const label = u.full_name || u.name || code;
              const checked = selection.includes(code);
              return (
                <label key={code || i} className="px-4 py-3 border-b flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelection((prev) =>
                        checked ? prev.filter((x) => x !== code) : [...prev, code]
                      )
                    }
                  />
                  <Avatar name={label} id={code} size="lg" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{label}</div>
                    <div className="text-xs text-gray-500 truncate">{String(code)}</div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-between items-center">
          <span className="text-xs text-gray-500">{selection.length} selected</span>
          {mode === "add" ? (
            <button
              className="px-3 py-2 rounded-lg bg-teal-600 text-white disabled:opacity-50"
              disabled={!selection.length || busy}
              onClick={() => onAdd?.(selection)}
            >
              Add
            </button>
          ) : (
            <button
              className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
              disabled={!selection.length || busy}
              onClick={() => onRemove?.(selection)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
