// src/components/chat/ParticipantsModal.jsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "./atoms";
import { useTheme } from "@/context/ThemeContext";

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
  const { theme } = useTheme(); // ensures re-render on theme switch
  const [name, setName] = useState(groupName);
  const [mode, setMode] = useState("add"); // add | remove
  const [selection, setSelection] = useState([]); // array of codes
  const dialogRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => setName(groupName || ""), [groupName]);

  // esc to close, focus first field on open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const participantCodes = useMemo(
    () => new Set(participants.map((p) => p.employee_code || p.code || p.id)),
    [participants]
  );

  const list = useMemo(() => {
    if (mode === "add") return allUsers.filter((u) => !participantCodes.has(u.employee_code));
    return participants;
  }, [mode, allUsers, participants, participantCodes]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.(); // backdrop click
      }}
      style={{ background: "var(--theme-backdrop)" }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg max-h-[70vh] rounded-xl shadow-lg overflow-hidden border"
        style={{
          background: "var(--theme-card-bg)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <h3 className="text-base font-semibold">Group participants</h3>
          <button
            className="p-1.5 rounded"
            onClick={onClose}
            aria-label="Close"
            style={{ color: "var(--theme-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Rename */}
        <div className="px-4 pt-4">
          <label className="block text-sm mb-1" style={{ color: "var(--theme-text-muted)" }}>
            Group name
          </label>
          <div className="flex gap-2">
            <input
              ref={nameRef}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                border: "1px solid var(--theme-input-border)",
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px var(--theme-primary)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name && name !== groupName && !busy) onRename?.(name);
              }}
            />
            <button
              className="px-3 py-2 rounded-lg font-medium transition disabled:opacity-50"
              disabled={!name || name === groupName || busy}
              onClick={() => onRename?.(name)}
              style={{
                background: "var(--theme-primary)",
                color: "var(--theme-primary-contrast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-primary)")}
            >
              Rename
            </button>
          </div>
        </div>

        {/* Add/Remove switch */}
        <div className="px-4 pt-4">
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded-full text-sm border transition"
              onClick={() => {
                setMode("add");
                setSelection([]);
              }}
              style={{
                background: mode === "add" ? "var(--theme-primary)" : "var(--theme-surface)",
                color: mode === "add" ? "var(--theme-primary-contrast)" : "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
            >
              Add
            </button>
            <button
              className="px-3 py-1 rounded-full text-sm border transition"
              onClick={() => {
                setMode("remove");
                setSelection([]);
              }}
              style={{
                background: mode === "remove" ? "var(--theme-primary)" : "var(--theme-surface)",
                color: mode === "remove" ? "var(--theme-primary-contrast)" : "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
            >
              Remove
            </button>
          </div>
        </div>

        {/* List */}
        <div
          className="max-h-[50vh] overflow-y-auto mt-3 border-t"
          style={{ borderColor: "var(--theme-border)" }}
        >
          {list.length === 0 ? (
            <div className="p-4 text-sm" style={{ color: "var(--theme-text-muted)" }}>
              No users.
            </div>
          ) : (
            list.map((u, i) => {
              const code = u.employee_code || u.code || u.id;
              const label = u.full_name || u.name || code;
              const checked = selection.includes(code);
              return (
                <label
                  key={code || i}
                  className="px-4 py-3 border-b flex items-center gap-3 cursor-pointer"
                  style={{ borderColor: "var(--theme-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
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
                    <div className="text-sm font-medium truncate" style={{ color: "var(--theme-text)" }}>
                      {label}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--theme-text-muted)" }}>
                      {String(code)}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex justify-between items-center border-t"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
            {selection.length} selected
          </span>

          {mode === "add" ? (
            <button
              className="px-3 py-2 rounded-lg font-medium transition disabled:opacity-50"
              disabled={!selection.length || busy}
              onClick={() => onAdd?.(selection)}
              style={{
                background: "var(--theme-accent)",
                color: "var(--theme-primary-contrast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.95")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Add
            </button>
          ) : (
            <button
              className="px-3 py-2 rounded-lg font-medium transition disabled:opacity-50"
              disabled={!selection.length || busy}
              onClick={() => onRemove?.(selection)}
              style={{
                background: "var(--theme-components-button-danger-bg)",
                color: "var(--theme-components-button-danger-text)",
                boxShadow: "0 10px 20px var(--theme-components-button-danger-shadow)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-components-button-danger-hover-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-components-button-danger-bg)")}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}