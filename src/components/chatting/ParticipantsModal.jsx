// src/components/chat/ParticipantsModal.jsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Shield, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Avatar } from "./atoms";
import { useTheme } from "@/context/ThemeContext";

/**
 * WhatsApp-like participants manager
 * - Mobile: full-height sheet; Desktop: centered card
 * - Sticky header & sticky search
 * - Two modes: Add | Remove
 * - Pill chips for current selection
 * - "Select all" for visible results
 * - Better a11y (ARIA, focus trap, Escape to close)
 */
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
  const { theme } = useTheme(); // re-render on theme switch

  // --- state
  const [name, setName] = useState(groupName);
  const [mode, setMode] = useState("add"); // 'add' | 'remove'
  const [selection, setSelection] = useState([]); // array of codes
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState(false);

  // --- refs
  const dialogRef = useRef(null);
  const nameRef = useRef(null);

  // sync external name -> state
  useEffect(() => setName(groupName || ""), [groupName]);

  // a11y: escape + focus trap
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // --- helpers to normalize API shapes
  const codeOf = (u) => u?.user_id || u?.employee_code || u?.code || u?.id;
  const labelOf = (u) => u?.full_name || u?.name || codeOf(u);
  const roleOf = (u) => u?.role_name || u?.role || u?.profile?.name || "";

  const participantCodes = useMemo(
    () => new Set((participants || []).map(codeOf)),
    [participants]
  );

  const addBase = useMemo(
    () => allUsers.filter((u) => !participantCodes.has(codeOf(u))),
    [allUsers, participantCodes]
  );
  const removeBase = participants || [];

  const baseList = mode === "add" ? addBase : removeBase;

  const list = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((u) => {
      const code = String(codeOf(u) ?? "");
      const name = String(labelOf(u) ?? "");
      const role = String(roleOf(u) ?? "");
      return (
        code.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q)
      );
    });
  }, [baseList, query]);

  const toggle = (code) => {
    setSelection((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const allVisibleSelected =
    list.length > 0 && list.every((u) => selection.includes(codeOf(u)));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleCodes = new Set(list.map(codeOf));
      setSelection((prev) => prev.filter((c) => !visibleCodes.has(c)));
    } else {
      const toAdd = list.map(codeOf).filter((c) => !selection.includes(c));
      setSelection((prev) => [...prev, ...toAdd]);
    }
  };

  const clearSelection = () => setSelection([]);

  const handleRename = async () => {
    if (!name || name === groupName || busy) return;
    try {
      setRenaming(true);
      await onRename?.(name);
    } finally {
      setRenaming(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 mt-16 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onBackdrop}
      style={{ background: "var(--theme-backdrop)" }}
    >
      {/* Sheet on mobile; Card on desktop */}
      <div
        ref={dialogRef}
        className="
  w-full max-w-xl
  max-h-[85vh]
  rounded-2xl
  shadow-xl border flex flex-col overflow-hidden
"
        style={{
          background: "var(--theme-card-bg)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)",
        }}
      >
        {/* HEADER (sticky) */}
        <div
          className="sticky top-0 z-10 border-b"
          style={{ background: "var(--theme-card-bg)", borderColor: "var(--theme-border)" }}
        >
          <div className="flex items-center gap-2 px-3 py-3">
            {/* Back on mobile for sheet-like feel */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[var(--theme-primary-softer)]"
              onClick={onClose}
              aria-label="Close"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                Group name
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  className="w-full bg-transparent outline-none text-base font-semibold"
                  style={{ color: "var(--theme-text)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                  }}
                />
                <button
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border hover:bg-[var(--theme-primary-softer)]"
                  disabled={!name || name === groupName || busy || renaming}
                  onClick={handleRename}
                  style={{ borderColor: "var(--theme-border)" }}
                >
                  {renaming ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="animate-spin" size={14} /> Saving
                    </span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>

            <button
              className="hidden md:inline-flex p-2 rounded-lg hover:bg-[var(--theme-primary-softer)]"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="px-3 pb-3">
            <div
              className="inline-flex rounded-full p-1 border"
              style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}
              role="tablist"
            >
              <TabBtn active={mode === "add"} onClick={() => { setMode("add"); clearSelection(); }}>
                Add
              </TabBtn>
              <TabBtn active={mode === "remove"} onClick={() => { setMode("remove"); clearSelection(); }}>
                Remove
              </TabBtn>
            </div>
          </div>

          {/* Sticky search row */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--theme-text-muted)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${mode === "add" ? "users to add" : "participants to remove"}…`}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--theme-input-background)",
                  color: "var(--theme-text)",
                  border: "1px solid var(--theme-input-border)",
                }}
              />
            </div>

            {/* Selection chips */}
            {selection.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {selection.slice(0, 6).map((code) => (
                  <Chip key={code} onRemove={() => toggle(code)}>
                    {code}
                  </Chip>
                ))}
                {selection.length > 6 && (
                  <span
                    className="text-xs px-2 py-1 rounded-full border"
                    style={{ color: "var(--theme-text-muted)", borderColor: "var(--theme-border)" }}
                  >
                    +{selection.length - 6} more
                  </span>
                )}
                <button
                  className="ml-auto text-xs underline hover:opacity-80"
                  onClick={clearSelection}
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Current participants block (like WhatsApp) */}
          <section className="px-3 pt-3">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--theme-text-muted)" }}>
              Current participants • {(participants || []).length}
            </div>

            {(!participants || participants.length === 0) ? (
              <div className="text-sm pb-2" style={{ color: "var(--theme-text-muted)" }}>
                No participants yet.
              </div>
            ) : (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--theme-border)" }}
              >
                {(participants || []).map((p, idx) => {
                  const code = codeOf(p);
                  const label = labelOf(p);
                  const role = roleOf(p);
                  return (
                    <div
                      key={code || idx}
                      className="px-3 py-3 border-b last:border-b-0 flex items-center gap-3"
                      style={{ borderColor: "var(--theme-border)" }}
                    >
                      <Avatar name={label} id={code} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{label}</div>
                          {p?.is_admin && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
                              style={{
                                background: "var(--theme-primary-softer)",
                                color: "var(--theme-primary)",
                              }}
                              title="Group admin"
                            >
                              <Shield size={12} /> Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--theme-text-muted)" }}>
                          {String(code)} {role ? `• ${role}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Add/Remove list */}
          <section className="px-3 pt-4 pb-24">
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-semibold" style={{ color: "var(--theme-text-muted)" }}>
                {mode === "add" ? "People you can add" : "Participants you can remove"}
              </div>
              <div className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
                • {list.length}
              </div>
              {list.length > 0 && (
                <button
                  className="ml-auto text-xs px-2 py-1 rounded-full border hover:bg-[var(--theme-primary-softer)]"
                  style={{ borderColor: "var(--theme-border)" }}
                  onClick={toggleSelectAllVisible}
                >
                  {allVisibleSelected ? "Unselect all" : "Select all"}
                </button>
              )}
            </div>

            {list.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
                No matches.
              </div>
            ) : (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--theme-border)" }}
              >
                {list.map((u, i) => {
                  const code = codeOf(u);
                  const label = labelOf(u);
                  const role = roleOf(u);
                  const checked = selection.includes(code);
                  return (
                    <button
                      key={code || i}
                      className="w-full text-left px-3 py-3 border-b last:border-b-0 flex items-center gap-3 hover:bg-[var(--theme-primary-softer)] focus:outline-none"
                      style={{ borderColor: "var(--theme-border)" }}
                      onClick={() => toggle(code)}
                    >
                      <div
                        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center
                          ${checked ? "bg-[var(--theme-primary)] border-transparent" : ""}`}
                        style={{ borderColor: "var(--theme-border)" }}
                        aria-checked={checked}
                        role="checkbox"
                      >
                        {checked && <Check size={14} color="var(--theme-primary-contrast)" />}
                      </div>
                      <Avatar name={label} id={code} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{label}</div>
                        <div className="text-xs truncate" style={{ color: "var(--theme-text-muted)" }}>
                          {String(code)} {role ? `• ${role}` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* FOOTER (sticky) */}
        <div
          className="sticky bottom-0 px-3 py-3 border-t bg-[var(--theme-card-bg)]"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--theme-text-muted)" }}>
              {selection.length} selected
            </span>

            <div className="ml-auto" />

            {mode === "add" ? (
              <button
                className="px-4 py-2 rounded-xl font-medium disabled:opacity-60"
                disabled={!selection.length || busy}
                onClick={() => onAdd?.(selection)}
                style={{
                  background: "var(--theme-accent)",
                  color: "var(--theme-primary-contrast)",
                }}
              >
                {busy ? "Adding…" : "Add"}
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded-xl font-medium disabled:opacity-60"
                disabled={!selection.length || busy}
                onClick={() => onRemove?.(selection)}
                style={{
                  background: "var(--theme-components-button-danger-bg)",
                  color: "var(--theme-components-button-danger-text)",
                  boxShadow: "0 10px 20px var(--theme-components-button-danger-shadow)",
                }}
              >
                {busy ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI bits ---------- */
function TabBtn({ active, onClick, children }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded-full transition ${
        active
          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
          : "text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ children, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border"
      style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}
    >
      {children}
      <button
        className="p-0.5 rounded-full hover:bg-[var(--theme-primary-softer)]"
         onClick={onRemove}
         aria-label="Remove selected"
      >
        <X size={12} />
      </button>
    </span>
  );
}
