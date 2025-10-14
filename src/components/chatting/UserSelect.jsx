// src/components/chat/UserSelect.jsx
"use client";
import React, { useMemo, useState } from "react";

export default function UserSelect({ users, value, onChange, placeholder, multiple = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const name = (u.full_name || u.name || "").toLowerCase();
        const code = (u.employee_code || "").toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 12);
  }, [users, query]);

  const displayValue = multiple
    ? Array.isArray(value) && value.length > 0
      ? `${value.length} selected`
      : ""
    : value
    ? `${value.full_name || value.name} (${value.employee_code})`
    : query;

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!multiple) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((user) => (
            <button
              key={user.employee_code}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm border-b border-gray-100 last:border-b-0"
              onClick={() => {
                if (multiple) {
                  const exists = value.find((v) => v.employee_code === user.employee_code);
                  if (!exists) onChange([...value, user]);
                } else {
                  onChange(user);
                  setQuery("");
                }
                setOpen(false);
              }}
            >
              <div className="font-medium">{user.full_name || user.name || user.employee_code}</div>
              <div className="text-xs text-gray-500">
                {user.employee_code}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
