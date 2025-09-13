// src/components/chat/utils.js
export const clsx = (...x) => x.filter(Boolean).join(" ");

export const toLocal = (iso) => {
  try { return new Date(iso); } catch { return new Date(); }
};

export const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "HH:MM" if <24h; weekday if <7d; else dd/mm */
export function humanTime(iso) {
  if (!iso) return "";
  const d = toLocal(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86_400_000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604_800_000)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export function compareMsgId(a, b) {
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb ? 0 : na < nb ? -1 : 1;
  return String(a).localeCompare(String(b));
}

export function fileKindIcon(mime, filename) {
  const m = (mime || "").toLowerCase();
  const f = (filename || "").toLowerCase();
  if (m.startsWith("image/")) return "🖼️";
  if (m === "application/pdf" || f.endsWith(".pdf")) return "📄";
  if (m.includes("sheet") || f.endsWith(".xls") || f.endsWith(".xlsx") || f.endsWith(".csv")) return "📊";
  if (m.startsWith("text/") || f.endsWith(".txt") || f.endsWith(".csv")) return "📝";
  return "📦";
}

// ——— message normalization helpers ———
export function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const body = raw.body ?? raw.text ?? raw.content ?? raw.message ?? "";

  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map((a) => ({
        id: a.id ?? a.attachment_id ?? a.idStr ?? `${Date.now()}`,
        filename: a.filename ?? a.name ?? "file",
        mime_type: a.mime_type ?? a.mimetype ?? "application/octet-stream",
        size_bytes: a.size_bytes ?? a.size ?? 0,
        url: a.url ?? a.link ?? "",
        thumb_url: a.thumb_url ?? a.thumbnail ?? null,
      }))
    : [];

  const m = {
    id:
      raw.id ??
      raw.message_id ??
      raw.msgId ??
      `${raw.thread_id ?? raw.threadId ?? "T"}-${raw.sender_id ??
        raw.senderId ??
        raw.from ??
        raw.from_employee_code ??
        raw.user ?? "U"}-${raw.timestamp ?? raw.time ?? Date.now()}`,
    thread_id: raw.thread_id ?? raw.threadId ?? raw.room_id ?? raw.roomId ?? raw.thread ?? null,
    sender_id: raw.sender_id ?? raw.senderId ?? raw.from_employee_code ?? raw.from ?? raw.user ?? "UNKNOWN",
    body,
    created_at: raw.created_at ?? raw.createdAt ?? raw.timestamp ?? raw.time ?? new Date().toISOString(),
    attachments,
    _type: raw.type ?? raw.event ?? undefined,
  };
  if (typeof m.created_at === "number") m.created_at = new Date(m.created_at).toISOString();
  return m;
}

export function unwrapWsEvent(data) {
  try { data = typeof data === "string" ? JSON.parse(data) : data; } catch {}
  const mergeEnv = (env, payload) => {
    if (!payload || typeof payload !== "object") payload = {};
    if (env && typeof env === "object") {
      if (env.senderId && payload.sender_id == null && payload.senderId == null) payload.senderId = env.senderId;
      if (env.createdAt && payload.created_at == null) payload.created_at = env.createdAt;
      if (env.timestamp && payload.timestamp == null) payload.timestamp = env.timestamp;
      if (env.time && payload.time == null) payload.time = env.time;
      if (env.id && payload.id == null) payload.id = env.id;
      if (env.type && payload.type == null) payload.type = env.type;
    }
    return payload;
  };

  if (data && typeof data === "object") {
    if (data.data && (data.type || data.kind)) return mergeEnv(data, data.data);
    if (data.payload && (data.event || data.type)) return mergeEnv(data, data.payload);
    if (data.message && typeof data.message === "object") return mergeEnv(data, data.message);
    return data;
  }
  return { body: String(data || ""), sender_id: "SYSTEM" };
}

export function makeWsUrl(httpBase, threadId, token) {
  let base = httpBase || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = `/api/v1/ws/chat/${threadId}`;
    if (token) u.searchParams.set("token", token);
    return u.toString();
  } catch {
    return `/api/v1/ws/chat/${threadId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }
}

export function makeInboxWsUrl(httpBase, token) {
  let base = httpBase || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = `/api/v1/ws/chat`;
    if (token) u.searchParams.set("token", token);
    return u.toString();
  } catch {
    return `/api/v1/ws/chat${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  }
}
