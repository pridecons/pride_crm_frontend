// src/components/Lead/MultiSelectWithCheckboxes.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";

export function MultiSelectWithCheckboxes({
  options = [],
  value = [],
  onChange,
  placeholder = "Select...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const toggle = (val) =>
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val]
    );

  return (
    <div className="relative w-full" ref={ref}>
      {/* Trigger */}
      <div
        className={`border px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center ${
          disabled ? "opacity-70 cursor-not-allowed" : ""
        }`}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          background:
            "var(--theme-components-input-bg, var(--theme-inputBackground))",
          color: "var(--theme-components-card-text, var(--theme-text))",
          borderColor:
            "var(--theme-components-input-border, var(--theme-inputBorder))",
        }}
      >
        <span
          style={{
            color:
              value.length === 0
                ? "var(--theme-components-input-placeholder, var(--theme-textSecondary))"
                : "var(--theme-components-card-text, var(--theme-text))",
          }}
          className="truncate"
        >
          {value.length === 0
            ? placeholder
            : options
                .filter((o) => value.includes(o.value))
                .map((o) => o.label)
                .join(", ")}
        </span>
        <span
          className="ml-2"
          aria-hidden
          style={{ color: "var(--theme-textSecondary)" }}
        >
          &#9662;
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-10 w-full rounded-lg border shadow max-h-52 overflow-auto mt-1"
          style={{
            background:
              "var(--theme-components-card-bg, var(--theme-cardBackground))",
            color: "var(--theme-components-card-text, var(--theme-text))",
            borderColor: "var(--theme-components-card-border, var(--theme-border))",
            boxShadow: "0 8px 24px var(--theme-shadow, rgba(0,0,0,0.12))",
          }}
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center px-3 py-2"
              style={{
                cursor: "pointer",
              }}
              onMouseDown={(e) => e.preventDefault()} // keep focus so click doesn't blur container
              onClick={() => toggle(opt.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggle(opt.value);
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={disabled}
                className="mr-2"
                style={{
                  accentColor:
                    "var(--theme-components-button-primary-bg, var(--theme-primary))",
                }}
              />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      <style jsx>{`
        /* Hover row using themed hover tint */
        label:hover {
          background: var(
            --theme-components-sidebar-hoverBg,
            color-mix(in oklab, var(--theme-primary, #3b82f6) 6%, transparent)
          );
        }
      `}</style>
    </div>
  );
}
