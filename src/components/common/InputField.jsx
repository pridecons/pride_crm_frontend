// FormComponents.jsx
import React from "react";

/**
 * Uses global CSS vars from your ThemeProvider, e.g.:
 * --theme-primary, --theme-primary-hover, --theme-border, --theme-card-bg,
 * --theme-panel, --theme-text, --theme-text-muted, --theme-danger, etc.
 * All have safe fallbacks so it works even without the provider.
 */

/** A standard text-based input (theme-only changes) */
export const InputField = ({
  label = "",
  name = "",
  id = 0,
  value = "",
  setValue = () => {},
  placeholder,
  labelCss = "",
  className = "",
  inputCss = "",
  type = "text",
  disabled = false,
  required = false,
  helpText = "",
  errorMessage = "",
}) => {
  const inputId = String(id || name || "");
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium mb-1 ${labelCss}`}
          style={{ color: "var(--theme-text-muted, #475569)" }}
        >
          {label}
          {required && " *"}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || (label ? `Enter ${label}` : undefined)}
        disabled={disabled}
        required={required}
        className={[
          "w-full rounded-lg p-2",
          "border-2",
          "focus:outline-none focus:ring-2 focus:border-transparent",
          "disabled:cursor-not-allowed",
          inputCss,
        ].join(" ")}
        style={{
          background: "var(--theme-card-bg, #ffffff)",
          color: "var(--theme-text, #0f172a)",
          borderColor: "var(--theme-border, #e5e7eb)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 0 2px var(--theme-primary, #6366f1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      {/* Placeholder color (scoped to this input id) */}
      {inputId ? (
        <style>{`
          #${CSS.escape(inputId)}::placeholder{
            color: var(--theme-text-muted, #64748b);
            opacity: .9;
          }
        `}</style>
      ) : null}

      {helpText && (
        <p className="mt-1 text-xs" style={{ color: "var(--theme-text-muted, #64748b)" }}>
          {helpText}
        </p>
      )}
      {errorMessage && (
        <p className="mt-1 text-xs" style={{ color: "var(--theme-danger, #dc2626)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
};

/** Dropdown button with checkbox list (same behavior; theme colors) */
export const DropdownCheckboxButton = ({
  label = "",
  name = "",
  id = 0,
  value = "",
  setValue = () => {},
  options = [],
  labelCss = "",
  className = "",
  inputCss = "",
  disabled = false,
}) => {
  const dropdownId = String(id || name || "dropdownCheckboxButton");
  const listId = `${dropdownId}-list`;
  const parts = (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {label && (
        <label
          className={`block text-sm font-medium mb-1 ${labelCss}`}
          style={{ color: "var(--theme-text-muted, #475569)" }}
        >
          {label}
        </label>
      )}

      <button
        id={dropdownId}
        data-dropdown-toggle={listId}
        type="button"
        disabled={disabled}
        className={[
          "inline-flex items-center px-4 py-2 rounded-lg",
          "text-white",
          "focus:outline-none focus:ring-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          inputCss,
        ].join(" ")}
        style={{
          background: "var(--theme-primary, #6366f1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "var(--theme-primary-hover, #4f46e5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--theme-primary, #6366f1)";
        }}
      >
        {value || "Select…"}
        <svg className="w-4 h-4 ms-2" aria-hidden="true" fill="none" viewBox="0 0 10 6">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {/* Dropdown popover — keep your existing dropdown library to toggle `.hidden` */}
      <div
        id={listId}
        className="hidden z-10 mt-2 w-48 rounded-lg shadow-sm"
        style={{
          background: "var(--theme-card-bg, #ffffff)",
          border: "1px solid var(--theme-border, #e5e7eb)",
        }}
      >
        <ul className="p-3 space-y-2 text-sm">
          {options.map((opt, i) => {
            const checked = parts.includes(opt.value);
            return (
              <li
                key={opt.value}
                style={
                  i
                    ? { borderTop: "1px solid var(--theme-border, #e5e7eb)" }
                    : undefined
                }
              >
                <label className="flex items-center py-1">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={checked}
                    onChange={(e) => {
                      const vals = new Set(
                        (value || "")
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean)
                      );
                      if (e.target.checked) vals.add(opt.value);
                      else vals.delete(opt.value);
                      setValue(Array.from(vals).join(","));
                    }}
                    disabled={disabled}
                    className="w-4 h-4 rounded"
                    style={{
                      accentColor: "var(--theme-primary, #6366f1)",
                      border: "1px solid var(--theme-border, #e5e7eb)",
                    }}
                  />
                  <span className="ms-2" style={{ color: "var(--theme-text-muted, #475569)" }}>
                    {opt.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
