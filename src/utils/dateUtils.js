// src/utils/dateUtils.js

// Choose how to send to API:
// - "offset": "YYYY-MM-DDTHH:MM:SS+05:30"  (offset-aware)
// - "naive":  "YYYY-MM-DDTHH:MM:SS"       (no Z, no offset)
export const CALLBACK_SEND_MODE = "offset";

const pad = (n) => String(n).padStart(2, "0");

/** Build "YYYY-MM-DDTHH:MM:SS+HH:MM" from a datetime-local value */
export function toISOWithOffset(datetimeLocalString) {
  if (!datetimeLocalString) return null;
  // datetimeLocalString e.g. "2025-08-30T15:45" (local)
  const d = new Date(datetimeLocalString);

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  const tz = -d.getTimezoneOffset(); // minutes ahead of UTC
  const sign = tz >= 0 ? "+" : "-";
  const offH = pad(Math.floor(Math.abs(tz) / 60));
  const offM = pad(Math.abs(tz) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offH}:${offM}`;
}

/** Build "YYYY-MM-DDTHH:MM:SS" (no Z, no offset) from a datetime-local value */
export function toNaiveLocal(datetimeLocalString) {
  if (!datetimeLocalString) return null;
  const d = new Date(datetimeLocalString);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

/** Single formatter to use everywhere when calling the API */
export function formatCallbackForAPI(datetimeLocalString) {
  return CALLBACK_SEND_MODE === "naive"
    ? toNaiveLocal(datetimeLocalString)
    : toISOWithOffset(datetimeLocalString);
}

/** For prefilling <input type="datetime-local"> from server values */
export function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function toIST(dateString) {
  if (!dateString) return "N/A";

  // Force treat input as UTC
  const utcDate = new Date(dateString + "Z");

  return utcDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}