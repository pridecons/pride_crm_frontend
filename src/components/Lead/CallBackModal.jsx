"use client";
import React from "react";

export default function CallBackModal({
  open,
  onClose,
  onSave,
  dateValue,
  setDateValue,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Set Call Back Date & Time</h2>

        {/* DateTime Input */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Call Back Date & Time
          </label>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
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
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
