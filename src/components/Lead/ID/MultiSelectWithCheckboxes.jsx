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
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);

  return (
    <div className="relative w-full" ref={ref}>
      <div
        className={`border px-3 py-2 rounded-lg bg-white cursor-pointer border-gray-300 flex justify-between ${disabled ? "bg-gray-100 text-gray-400" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span>
          {value.length === 0
            ? <span className="text-gray-400">{placeholder}</span>
            : options.filter(o => value.includes(o.value)).map(o => o.label).join(", ")
          }
        </span>
        <span className="ml-2">&#9662;</span>
      </div>
      {open && (
        <div className="absolute z-10 w-full bg-white border rounded shadow max-h-52 overflow-auto mt-1">
          {options.map(opt => (
            <label key={opt.value} className="flex items-center px-3 py-2 hover:bg-gray-100">
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={disabled}
                className="mr-2 accent-blue-500"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
