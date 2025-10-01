// src/components/chat/UserSelect.jsx
"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function UserSelect({
  users = [],
  value = [],            // array of selected user objects
  onChange = () => {},
  placeholder = "Search users...",
  multiple = true,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const normalized = useMemo(() => {
    return (users || []).map((u) => ({
      id: u.employee_code ?? u.id ?? String(u.value ?? ""),
      label: u.full_name || u.name || u.label || u.employee_code || "Unknown",
      raw: u,
    }));
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized.slice(0, 50);
    return normalized
      .filter(
        (u) =>
          u.label.toLowerCase().includes(q) ||
          String(u.id).toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [normalized, query]);

  const isSelected = (id) => value.some((v) => (v.employee_code ?? v.id) === id);

  const toggleSelect = (opt) => {
    if (multiple) {
      const exists = isSelected(opt.id);
      const next = exists
        ? value.filter((v) => (v.employee_code ?? v.id) !== opt.id)
        : [...value, opt.raw];
      onChange(next);
      // IMPORTANT: clear only the search text, not replace with "X selected"
      setQuery("");
      // Keep focus for fast multi-adding
      inputRef.current?.focus();
      setOpen(true);
    } else {
      onChange([opt.raw]);
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 pr-24"
          placeholder={placeholder}
          autoComplete="off"
        />

        {/* Non-interactive badge overlay (does NOT change input value) */}
        {value.length > 0 && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {value.length} selected
          </span>
        )}
      </div>

      {/* Popover list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
          ) : (
            <ul className="py-1">
              {filtered.map((u) => {
                const selected = isSelected(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(u)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                        selected ? "bg-green-50" : ""
                      }`}
                    >
                      <span className="truncate">
                        {u.label}{" "}
                        <span className="text-gray-400">· {u.id}</span>
                      </span>
                      {selected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                          added
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
