// src/components/chat/NewChatModal.jsx
"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import UserSelect from "./EmpSelect";
import { useTheme } from "@/context/ThemeContext";

export default function NewChatModal({ isOpen, onClose, users, onCreateGroup }) {
  // not used directly; keeps component reactive on theme switch
  const { theme } = useTheme();

  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);

  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const lastFocusRef = useRef(null);

  const resetState = useCallback(() => {
    setGroupName("");
    setGroupUsers([]);
  }, []);

  const handleCreateGroup = useCallback(() => {
    const name = groupName.trim();
    if (!name || groupUsers.length === 0) return;
    onCreateGroup?.(name, groupUsers);
    resetState();
    onClose?.();
  }, [groupName, groupUsers, onCreateGroup, onClose, resetState]);

  // Close on backdrop click
  const onBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // Body scroll lock + focus restore
  useEffect(() => {
    if (!isOpen) return;
    lastFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const to = setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      clearTimeout(to);
      document.body.style.overflow = prevOverflow;
      // restore focus back to the opener if possible
      if (lastFocusRef.current && lastFocusRef.current.focus) {
        try { lastFocusRef.current.focus(); } catch {}
      }
    };
  }, [isOpen]);

  // Global key handlers (Esc to close, Enter to submit)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter") {
        const insideDialog = dialogRef.current?.contains(document.activeElement);
        if (insideDialog) handleCreateGroup();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleCreateGroup, onClose]);

  // Simple focus trap
  useEffect(() => {
    if (!isOpen) return;
    const root = dialogRef.current;
    if (!root) return;

    const getFocusable = () =>
      Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));

    const onKeydown = (e) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    root.addEventListener("keydown", onKeydown);
    return () => root.removeEventListener("keydown", onKeydown);
  }, [isOpen]);

  if (!isOpen) return null;

  const disabled = !groupName.trim() || groupUsers.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-group-title"
      aria-describedby="new-group-desc"
      onMouseDown={onBackdropMouseDown}
      style={{ background: "var(--theme-backdrop, rgba(0,0,0,0.5))" }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl shadow-2xl border outline-none"
        role="document"
        style={{
          background: "var(--theme-card-bg)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)",
          boxShadow: `0 20px 50px var(--theme-shadow, rgba(0,0,0,0.25))`,
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between border-b rounded-t-2xl"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <h3 id="new-group-title" className="text-lg font-semibold">
            Create Group
          </h3>
          <button
            type="button"
            onClick={() => { resetState(); onClose?.(); }}
            className="text-sm px-2 py-1 rounded"
            aria-label="Close"
            style={{ color: "var(--theme-text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p id="new-group-desc" className="sr-only">
            Enter a group name and choose participants to create a group chat.
          </p>

          <div>
            <label
              htmlFor="group-name"
              className="block text-sm mb-1"
              style={{ color: "var(--theme-text-muted)" }}
            >
              Group name
            </label>
            <input
              id="group-name"
              ref={inputRef}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition"
              placeholder="e.g., Research Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                border: "1px solid var(--theme-input-border, var(--theme-border))",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.boxShadow = "0 0 0 2px var(--theme-primary)")
              }
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
          </div>

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
              placeholder="Search users…"
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
                      type="button"
                      onClick={() =>
                        setGroupUsers((prev) =>
                          prev.filter((x) => x.employee_code !== u.employee_code)
                        )
                      }
                      className="px-1 rounded"
                      aria-label={`Remove ${u.full_name || u.name || u.employee_code}`}
                      style={{ color: "var(--theme-text-muted)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--theme-primary-softer)")
                      }
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
            type="button"
            onClick={handleCreateGroup}
            disabled={disabled}
            className="w-full py-2 rounded-lg font-medium transition"
            style={{
              background: "var(--theme-primary)",
              color: "var(--theme-primary-contrast, #fff)",
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: "0 10px 20px var(--theme-shadow, rgba(0,0,0,0.08))",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--theme-primary-hover, var(--theme-primary))")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--theme-primary)")
            }
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
