// UserFilters.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Search } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

const toStringSafe = (v) => (v == null ? "" : String(v));

export default function UserFilters({
  searchQuery,
  setSearchQuery,
  selectedRole,       // role ID or "All"
  setSelectedRole,
  roles = [],  
}) {
  const { hasPermission } = usePermissions();

  // Role options: value=id (string), label=name
  const normalizedRoles = useMemo(() => {
    const out = [];
    (roles || []).forEach((r) => {
      if (r?.id == null || !r?.name) return;
      out.push({
        value: String(r.id),
        label: String(r.name),
        raw: r,
      });
    });
    return out;
  }, [roles]);

  // theme-driven styles
  const fieldBase = "h-12 rounded-xl transition outline-none border px-4";
  const inputStyle = {
    background: "var(--theme-card-bg)",
    color: "var(--theme-text)",
    borderColor: "var(--theme-border)",
  };
  const focusStyle = {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--theme-primary) 20%, transparent)",
    borderColor: "var(--theme-primary)",
  };


  // grid template: 1fr for search, fixed 220px for each select (keeps one-line layout on lg+)
  const gridTemplate ="1fr 220px";

  return (
    <div
      className="rounded-2xl shadow-lg p-4 mb-6 border"
      style={{
        background: "var(--theme-surface, var(--theme-card-bg))",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      <div
        className="grid gap-3 items-center"
        style={{
          gridTemplateColumns: gridTemplate,
        }}
      >
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: "var(--theme-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search by name, email, phone or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${fieldBase} pl-10 w-90`}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.currentTarget.style, { ...inputStyle, ...focusStyle })}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          />
          <style jsx>{`
            input::placeholder { color: var(--theme-text-muted); opacity: 1; }
          `}</style>
        </div>

        {/* Role filter (by role ID) */}
        {hasPermission("user_all_roles") && (
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={`${fieldBase} w-full`}
            style={{
              ...inputStyle,
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              backgroundImage:
                "linear-gradient(45deg, transparent 50%, var(--theme-text) 50%), linear-gradient(135deg, var(--theme-text) 50%, transparent 50%)",
              backgroundPosition:
                "calc(100% - 22px) calc(50% + 2px), calc(100% - 16px) calc(50% + 2px)",
              backgroundSize: "6px 6px, 6px 6px",
              backgroundRepeat: "no-repeat",
              paddingRight: "36px",
            }}
            onFocus={(e) => Object.assign(e.currentTarget.style, { ...e.currentTarget.style, ...focusStyle })}
            onBlur={(e) => Object.assign(e.currentTarget.style, inputStyle)}
          >
            <option value="All">All Roles</option>
            {normalizedRoles.map((r) => (
              <option key={`role-${r.value}`} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}

      </div>
    </div>
  );
}
