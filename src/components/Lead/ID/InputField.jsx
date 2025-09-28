// src/components/Lead/InputField.jsx
"use client";
import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

export function InputField({
  label,
  name,
  value,
  type = "text",
  icon: Icon,
  options = [],
  placeholder,
  rows = 3,
  isEditMode,
  onInputChange,
  suffix,
}) {
  const labelStyle = { color: "var(--theme-text,#0f172a)" };
  const iconStyle = { color: "var(--theme-text-muted,#64748b)" };

  const baseFieldStyle = {
    background: "var(--theme-card-bg,#ffffff)",
    color: "var(--theme-text,#0f172a)",
    border: "1px solid var(--theme-border,#e5e7eb)",
    outline: "none",
  };

  const viewBoxStyle = {
    background: "var(--theme-panel,#f8fafc)",
    color: "var(--theme-text,#0f172a)",
    border: "1px solid var(--theme-border,#e5e7eb)",
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium" style={labelStyle}>
        {Icon && <Icon size={16} className="mr-2" style={iconStyle} />}
        {label}
      </label>

      {isEditMode && type !== "readonly" ? (
        type === "select" ? (
          <select
            name={name}
            value={value || ""}
            onChange={onInputChange}
            className="w-full px-3 py-2 rounded-lg"
            style={baseFieldStyle}
          >
            <option value="">{`Select ${label}`}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            name={name}
            value={value || ""}
            onChange={onInputChange}
            rows={rows}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg resize-none"
            style={baseFieldStyle}
          />
        ) : (
          <div className="relative">
            <input
              type={type}
              name={name}
              value={
                type === "date"
                  ? value
                    ? new Date(value).toISOString().split("T")[0]
                    : ""
                  : value || ""
              }
              onChange={onInputChange}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg"
              style={baseFieldStyle}
            />
            {suffix && (
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                {suffix}
              </div>
            )}
          </div>
        )
      ) : (
        <div
          className="px-3 py-2 rounded-lg min-h-[38px] flex items-center border"
          style={viewBoxStyle}
        >
          <span className="break-words">
            {Array.isArray(value) ? value.join(", ") : value || "—"}
          </span>
        </div>
      )}
    </div>
  );
}
