// src/components/chat/NewChatModal.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import UserSelect from "./EmpSelect";
import { useTheme } from "@/context/ThemeContext";

export default function NewChatModal({ isOpen, onClose, users, onCreateGroup }) {
  const { theme } = useTheme(); // not used directly, but keeps modal reactive on theme switch
  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  const handleCreateGroup = () => {
    if (!groupName.trim() || groupUsers.length === 0) return;
    onCreateGroup(groupName.trim(), groupUsers);
    setGroupName("");
    setGroupUsers([]);
    onClose();
  };

  // Close on Esc; focus the first field on open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (document.activeElement === inputRef.current || dialogRef.current?.contains(document.activeElement))) {
        handleCreateGroup();
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // close when clicking the backdrop (not the panel)
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ background: "var(--theme-backdrop)" }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg shadow-lg border"
        style={{
          background: "var(--theme-card-bg)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)",
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <h3 className="text-lg font-semibold">Create Group</h3>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded"
            aria-label="Close"
            style={{
              color: "var(--theme-text-muted)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <input
            ref={inputRef}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            style={{
              background: "var(--theme-input-background)",
              color: "var(--theme-text)",
              border: "1px solid var(--theme-input-border)",
            }}
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px var(--theme-primary)")}
            onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          />

          <div>
            <label
              className="block text-sm mb-2"
              style={{ color: "var(--theme-text-muted)" }}
            >
              Add participants
            </label>
            <UserSelect
              users={users}
              value={groupUsers}
              onChange={setGroupUsers}
              placeholder="Search users..."
              multiple
            />

            {groupUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {groupUsers.map((u) => (
                  <span
                    key={u.employee_code}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                    style={{
                      background: "var(--theme-components-tag-neutral-bg)",
                      color: "var(--theme-components-tag-neutral-text)",
                      borderColor: "var(--theme-components-tag-neutral-border)",
                    }}
                  >
                    {u.full_name || u.name || u.employee_code}
                    <button
                      onClick={() =>
                        setGroupUsers(groupUsers.filter((x) => x.employee_code !== u.employee_code))
                      }
                      className="px-1 rounded"
                      aria-label={`Remove ${u.full_name || u.name || u.employee_code}`}
                      style={{ color: "var(--theme-text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || groupUsers.length === 0}
            className="w-full py-2 rounded-lg font-medium transition"
            style={{
              background: "var(--theme-primary)",
              color: "var(--theme-primary-contrast)",
              opacity: !groupName.trim() || groupUsers.length === 0 ? 0.6 : 1,
              cursor: !groupName.trim() || groupUsers.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-primary)")}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
