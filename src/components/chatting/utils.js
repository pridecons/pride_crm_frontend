// src/components/chat/utils.js
export const clsx = function () {
  var out = [];
  for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
  return out.join(" ");
};

export const toLocal = function (iso) {
  try { return new Date(iso); } catch (e) { return new Date(); }
};

export const isSameDay = function (a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
};

/** "HH:MM" if <24h; weekday if <7d; else dd/mm */
export function humanTime(iso) {
  if (!iso) return "";
  var d = toLocal(iso);
  var now = new Date();
  var diff = now - d;
  var DAY = 86400000;      // 86_400_000
  var WEEK = 604800000;    // 604_800_000
  if (diff < DAY) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < WEEK) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export function compareMsgId(a, b) {
  var na = Number(a), nb = Number(b);
  if (!isNaN(na) && !isNaN(nb)) return na === nb ? 0 : (na < nb ? -1 : 1);
  return String(a).localeCompare(String(b));
}

export function fileKindIcon(mime, filename) {
  var m = (mime || "").toLowerCase();
  var f = (filename || "").toLowerCase();
  if (m.indexOf("image/") === 0) return "🖼️";
  if (m === "application/pdf" || f.slice(-4) === ".pdf") return "📄";
  if (m.indexOf("sheet") !== -1 || /\.xls$|\.xlsx$|\.csv$/.test(f)) return "📊";
  if (m.indexOf("text/") === 0 || /\.txt$|\.csv$/.test(f)) return "📝";
  return "📦";
}

// —— message normalization helpers (no ??) ——
export function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  var body = (raw.body != null ? raw.body :
             raw.text != null ? raw.text :
             raw.content != null ? raw.content :
             raw.message != null ? raw.message : "");

  var attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(function (a) {
        return {
          id: (a.id != null ? a.id :
              a.attachment_id != null ? a.attachment_id :
              a.idStr != null ? a.idStr : String(Date.now())),
          filename: (a.filename != null ? a.filename :
                    a.name != null ? a.name : "file"),
          mime_type: (a.mime_type != null ? a.mime_type :
                     a.mimetype != null ? a.mimetype : "application/octet-stream"),
          size_bytes: (a.size_bytes != null ? a.size_bytes :
                      a.size != null ? a.size : 0),
          url: (a.url != null ? a.url :
               a.link != null ? a.link : ""),
          thumb_url: (a.thumb_url != null ? a.thumb_url :
                     a.thumbnail != null ? a.thumbnail : null)
        };
      })
    : [];

  var threadId = (raw.thread_id != null ? raw.thread_id :
                 raw.threadId != null ? raw.threadId :
                 raw.room_id != null ? raw.room_id :
                 raw.roomId != null ? raw.roomId :
                 raw.thread != null ? raw.thread : null);

  var senderId = (raw.sender_id != null ? raw.sender_id :
                 raw.senderId != null ? raw.senderId :
                 raw.from_employee_code != null ? raw.from_employee_code :
                 raw.from != null ? raw.from :
                 raw.user != null ? raw.user : "UNKNOWN");

  var createdAt = (raw.created_at != null ? raw.created_at :
                  raw.createdAt != null ? raw.createdAt :
                  raw.timestamp != null ? raw.timestamp :
                  raw.time != null ? raw.time : new Date().toISOString());

  var id = (raw.id != null ? raw.id :
           raw.message_id != null ? raw.message_id :
           raw.msgId != null ? raw.msgId :
           (String(threadId || "T") + "-" + String(senderId || "U") + "-" + String(createdAt)));

  if (typeof createdAt === "number") createdAt = new Date(createdAt).toISOString();

  return {
    id: id,
    thread_id: threadId,
    sender_id: senderId,
    body: body,
    created_at: createdAt,
    attachments: attachments,
    _type: (raw.type != null ? raw.type :
           raw.event != null ? raw.event : undefined)
  };
}

// Be very defensive when parsing incoming socket payloads
export function unwrapWsEvent(data) {
  try { data = (typeof data === "string") ? JSON.parse(data) : data; } catch (e) {}
  function mergeEnv(env, payload) {
    if (!payload || typeof payload !== "object") payload = {};
    if (env && typeof env === "object") {
      if (env.senderId != null && payload.sender_id == null && payload.senderId == null) payload.senderId = env.senderId;
      if (env.createdAt != null && payload.created_at == null) payload.created_at = env.createdAt;
      if (env.timestamp != null && payload.timestamp == null) payload.timestamp = env.timestamp;
      if (env.time != null && payload.time == null) payload.time = env.time;
      if (env.id != null && payload.id == null) payload.id = env.id;
      if (env.type != null && payload.type == null) payload.type = env.type;
    }
    return payload;
  }

  if (data && typeof data === "object") {
    if (data.data && (data.type || data.kind)) return mergeEnv(data, data.data);
    if (data.payload && (data.event || data.type)) return mergeEnv(data, data.payload);
    if (data.message && typeof data.message === "object") return mergeEnv(data, data.message);
    return data;
  }
  return { body: String(data || ""), sender_id: "SYSTEM" };
}

// Avoid new URL() on legacy browsers; build strings manually.
function wsSchemeFrom(locProtocol) { return locProtocol === "https:" ? "wss:" : "ws:"; }

export function makeWsUrl(httpBase, threadId, token) {
  try {
    var base = httpBase || (typeof window !== "undefined" ? window.location.origin : "");
    // base might be like http(s)://host[:port][/something]
    var a = document.createElement("a");
    a.href = base;
    var proto = wsSchemeFrom(a.protocol || (typeof location !== "undefined" ? location.protocol : "http:"));
    var host = a.host || (typeof location !== "undefined" ? location.host : "");
    var path = "/api/v1/ws/chat/" + String(threadId);
    var url = proto + "//" + host + path + (token ? ("?token=" + encodeURIComponent(token)) : "");
    return url;
  } catch (e) {
    // relative fallback
    return "/api/v1/ws/chat/" + String(threadId) + (token ? ("?token=" + encodeURIComponent(token)) : "");
  }
}

export function makeInboxWsUrl(httpBase, token) {
  try {
    var base = httpBase || (typeof window !== "undefined" ? window.location.origin : "");
    var a = document.createElement("a");
    a.href = base;
    var proto = wsSchemeFrom(a.protocol || (typeof location !== "undefined" ? location.protocol : "http:"));
    var host = a.host || (typeof location !== "undefined" ? location.host : "");
    var path = "/api/v1/ws/chat";
    var url = proto + "//" + host + path + (token ? ("?token=" + encodeURIComponent(token)) : "");
    return url;
  } catch (e) {
    return "/api/v1/ws/chat" + (token ? ("?token=" + encodeURIComponent(token)) : "");
  }
}
