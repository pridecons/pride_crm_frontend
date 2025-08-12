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
  return (
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700">
        {Icon && <Icon size={16} className="mr-2 text-gray-500" />}
        {label}
      </label>

      {isEditMode && type !== "readonly" ? (
        // ————— your existing edit-mode branches (select/textarea/checkbox/etc) —————
        type === "select" ? (
          <select
            name={name}
            value={value || ""}
            onChange={onInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select {label}</option>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            {suffix && (
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                {suffix}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="px-3 py-2 bg-gray-50 rounded-lg min-h-[38px] flex items-center">
          {/* — your view-mode rendering (checkbox badge, formatted date or text) — */}
          <span className="text-gray-900 break-words">
            {Array.isArray(value) ? value.join(", ") : value || "—"}
          </span>
        </div>
      )}
    </div>
  );
}
