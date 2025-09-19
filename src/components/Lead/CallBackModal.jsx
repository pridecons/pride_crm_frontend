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

  // ⬇️ Minimum allowed = TODAY 00:00 (local time).
  // If you want "no past time today" instead, use minNow below.
  const minToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // today midnight local
    const tzo = d.getTimezoneOffset();
    const localISO = new Date(d.getTime() - tzo * 60000)
      .toISOString()
      .slice(0, 16); // 'YYYY-MM-DDTHH:mm'
    return localISO;
  }, []);

  // 🔄 Alternative (block past minutes too):
  // const minToday = useMemo(() => {
  //   const d = new Date();
  //   d.setSeconds(0, 0); // round seconds
  //   const tzo = d.getTimezoneOffset();
  //   return new Date(d.getTime() - tzo * 60000).toISOString().slice(0, 16);
  // }, []);

  const handleDone = useCallback(() => {
    inputRef.current?.blur(); // hides native picker
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onKeyDown={(e) => {
        if (e.key === "Escape") handleDone();
      }}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Set Call Back Date & Time</h2>
        {/* Helper Text */}
        <p className="mb-2 text-xs text-red-500 italic">
          Tip: Select date & time, then click <strong>anywhere outside</strong> / press <kbd>ESC</kbd> to close.
        </p>

        {/* DateTime Input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Call Back Date & Time
          </label>
          <input
            ref={inputRef}
            type="datetime-local"
            value={dateValue || ""}
            step="60"
            min={minToday}
            onChange={(e) => {
              const v = e.target.value;
              // Clamp to min if user types an earlier date
              setDateValue(v && v < minToday ? minToday : v);
            }}
            className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-200"
          />
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || (dateValue && dateValue < minToday)}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
