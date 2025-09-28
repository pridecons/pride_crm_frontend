"use client";
import React, { useRef, useCallback, useMemo } from "react";

export default function CallBackModal({
  open,
  onClose,
  onSave,
  dateValue,
  setDateValue,
  loading = false,
}) {
  const inputRef = useRef(null);

  // Minimum allowed = TODAY 00:00 (local time)
  const minToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const tzo = d.getTimezoneOffset();
    const localISO = new Date(d.getTime() - tzo * 60000)
      .toISOString()
      .slice(0, 16);
    return localISO;
  }, []);

  const handleDone = useCallback(() => {
    inputRef.current?.blur();
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") handleDone();
      }}
      style={{
        background: "var(--theme-components-modal-overlay, rgba(0,0,0,.30))",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 shadow-lg"
        style={{
          background: "var(--theme-components-modal-bg)",
          color: "var(--theme-components-modal-text)",
          border: "1px solid var(--theme-components-modal-border)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--theme-text)" }}
        >
          Set Call Back Date &amp; Time
        </h2>

        {/* Helper Text */}
        <p
          className="mb-2 text-xs italic"
          style={{ color: "var(--theme-warning, #f59e0b)" }}
        >
          Tip: Select date &amp; time, then click <strong>anywhere outside</strong> / press <kbd>ESC</kbd> to close.
        </p>

        {/* DateTime Input */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--theme-text)" }}
          >
            Call Back Date &amp; Time
          </label>
          <input
            ref={inputRef}
            type="datetime-local"
            value={dateValue || ""}
            step="60"
            min={minToday}
            onChange={(e) => {
              const v = e.target.value;
              setDateValue(v && v < minToday ? minToday : v);
            }}
            className="w-full rounded outline-none"
            style={{
              background: "var(--theme-components-input-bg)",
              color: "var(--theme-components-input-text)",
              border: "1px solid var(--theme-components-input-border)",
              padding: "0.5rem 0.75rem",
              boxShadow: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = `0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)`;
              e.currentTarget.style.borderColor = "var(--theme-components-input-focus)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--theme-components-input-border)";
            }}
          />
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow:
                "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-hoverBg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-bg)")
            }
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={loading || (dateValue && dateValue < minToday)}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              background: "var(--theme-components-button-primary-bg)",
              color: "var(--theme-components-button-primary-text)",
              border:
                "1px solid var(--theme-components-button-primary-border, transparent)",
              boxShadow:
                "0 6px 16px -6px var(--theme-components-button-primary-shadow)",
              cursor:
                loading || (dateValue && dateValue < minToday)
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading || (dateValue && dateValue < minToday) ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!(loading || (dateValue && dateValue < minToday))) {
                e.currentTarget.style.background =
                  "var(--theme-components-button-primary-hoverBg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!(loading || (dateValue && dateValue < minToday))) {
                e.currentTarget.style.background =
                  "var(--theme-components-button-primary-bg)";
              }
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
