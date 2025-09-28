"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "@/components/Lead/ID/Modal";
import { Send, RefreshCcw, Search, MessageSquare, X } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* ================================
   THEME (colors only) + dark mode
   — no logic changes
   ================================ */
const ThemeStyles = () => (
  <style
    // You can move these vars to a global CSS once.
    dangerouslySetInnerHTML={{
      __html: `
:root{
  --theme-primary:#4f46e5;     /* indigo-600 */
  --theme-primary-500:#6366f1;  /* indigo-500 */
  --theme-on-primary:#ffffff;

  --theme-accent:#6366f1;       /* indigo-500 */
  --theme-success:#16a34a;      /* green-600 */
  --theme-danger:#dc2626;       /* red-600 */

  --theme-card:#ffffff;
  --theme-panel:#f8fafc;        /* slate-50 */
  --theme-border:#e5e7eb;       /* gray-200 */

  --theme-text:#0f172a;         /* slate-900 */
  --theme-muted:#64748b;        /* slate-500 */
  --theme-muted-ink:#94a3b8;    /* slate-400 */

  --theme-backdrop:rgba(11,18,32,.45);

  --theme-primary-soft:rgba(79,70,229,.07);
  --theme-primary-softer:rgba(79,70,229,.05);
  --theme-success-soft:rgba(22,163,74,.10);
  --theme-danger-soft:rgba(220,38,38,.10);
}

.dark{
  --theme-primary:#818cf8;      /* indigo-400 */
  --theme-primary-500:#a5b4fc;
  --theme-on-primary:#0b1220;

  --theme-accent:#a78bfa;       /* violet-400 */
  --theme-success:#22c55e;      /* green-500 */
  --theme-danger:#ef4444;       /* red-500 */

  --theme-card:#0f172a;         /* slate-900 */
  --theme-panel:#0b1220;        /* deep */
  --theme-border:#1f2937;       /* gray-800 */

  --theme-text:#e5e7eb;         /* gray-200 */
  --theme-muted:#9ca3af;        /* gray-400 */
  --theme-muted-ink:#6b7280;    /* gray-500 */

  --theme-backdrop:rgba(0,0,0,.55);

  --theme-primary-soft:rgba(129,140,248,.16);
  --theme-primary-softer:rgba(129,140,248,.10);
  --theme-success-soft:rgba(34,197,94,.14);
  --theme-danger-soft:rgba(239,68,68,.14);
}
`,
    }}
  />
);

/** helpers */
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "-");
const cleanParams = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && String(v).trim() !== ""
    )
  );

export default function SMSModalWithLogs({
  open,
  onClose,
  leadMobile = "",
  leadName = "",
}) {
  const [tab, setTab] = useState("send"); // 'send' | 'logs'

  // ---- SEND TAB ----
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [phone, setPhone] = useState(leadMobile || "");
  const [messageOverride, setMessageOverride] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPhone(leadMobile || "");
    setLastResponse(null);
    (async () => {
      try {
        setLoadingTemplates(true);
        const { data } = await axiosInstance.get(
          "/sms-templates/?skip=0&limit=200"
        );
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setTemplates(
          arr.map((t) => ({
            id: t.id,
            label: t.title || t.name || `Template #${t.id}`,
          }))
        );
      } catch {
        setTemplates([]); // allow manual entry
      } finally {
        setLoadingTemplates(false);
      }
    })();
  }, [open, leadMobile]);

  const canSend = useMemo(() => {
    const idOk = templateId && String(templateId).trim() !== "";
    const phoneOk = phone && String(phone).trim().length >= 10;
    return idOk && phoneOk && !sending;
  }, [templateId, phone, sending]);

  const handleSend = async () => {
    if (!canSend) {
      ErrorHandling({ defaultError: "Template & phone are required" });
      return;
    }
    try {
      setSending(true);
      const payload = {
        template_id: Number(templateId),
        phone_number: String(phone).trim(),
      };
      if (messageOverride && messageOverride.trim()) {
        payload.message_override = messageOverride.trim();
      }
      const { data } = await axiosInstance.post(
        "/sms-templates/send-sms",
        payload
      );
      setLastResponse(data);
      toast.success("SMS sent successfully");
      setTab("logs");
      setFilters((prev) => ({ ...prev, phone: payload.phone_number, offset: 0 }));
      await fetchLogs({ ...filters, phone: payload.phone_number, offset: 0 });
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to send SMS" });
    } finally {
      setSending(false);
    }
  };

  // ---- LOGS TAB ----
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filters, setFilters] = useState({
    user_id: "",
    template_id: "",
    phone: leadMobile || "",
    start_date: "",
    end_date: "",
    limit: 50,
    offset: 0,
  });

  const fetchLogs = async (params = filters) => {
    try {
      setLoadingLogs(true);
      const { data } = await axiosInstance.get("/sms-templates/logs", {
        params: cleanParams(params),
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to load SMS logs" });
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (open && tab === "logs") fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const nextPage = () => {
    const newOffset = (filters.offset || 0) + (filters.limit || 50);
    if (newOffset >= total) return;
    const p = { ...filters, offset: newOffset };
    setFilters(p);
    fetchLogs(p);
  };
  const prevPage = () => {
    const newOffset = Math.max(0, (filters.offset || 0) - (filters.limit || 50));
    const p = { ...filters, offset: newOffset };
    setFilters(p);
    fetchLogs(p);
  };

  const handleResend = async (row) => {
    try {
      await axiosInstance.post("/sms-templates/send-sms", {
        template_id: row.template_id,
        phone_number: row.recipient_phone_number.startsWith("91")
          ? row.recipient_phone_number.slice(2)
          : row.recipient_phone_number,
        message_override: row.body,
      });
      toast.success("Re-sent");
      fetchLogs();
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to resend" });
    }
  };

  const TitleTabs = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTab("send")}
        className="px-3 py-1 rounded-full text-sm border transition"
        style={{
          background: tab === "send" ? "var(--theme-card)" : "transparent",
          color: tab === "send" ? "var(--theme-primary)" : "var(--theme-on-primary)",
          borderColor:
            tab === "send" ? "var(--theme-card)" : "rgba(255,255,255,.35)",
        }}
      >
        Send
      </button>
      <button
        onClick={() => setTab("logs")}
        className="px-3 py-1 rounded-full text-sm border transition"
        style={{
          background: tab === "logs" ? "var(--theme-card)" : "transparent",
          color: tab === "logs" ? "var(--theme-primary)" : "var(--theme-on-primary)",
          borderColor:
            tab === "logs" ? "var(--theme-card)" : "rgba(255,255,255,.35)",
        }}
      >
        Logs
      </button>
    </div>
  );

  const actions =
    tab === "send"
      ? [
          <button
            key="close"
            onClick={onClose}
            className="px-4 py-2 rounded-xl"
            style={{
              background: "var(--theme-card)",
              color: "var(--theme-text)",
              border: "1px solid var(--theme-border)",
            }}
          >
            Close
          </button>,
          <button
            key="send"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50"
            style={{
              background: "var(--theme-primary)",
              color: "var(--theme-on-primary)",
            }}
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send SMS"}
          </button>,
        ]
      : [
          <button
            key="close"
            onClick={onClose}
            className="px-4 py-2 rounded-xl"
            style={{
              background: "var(--theme-card)",
              color: "var(--theme-text)",
              border: "1px solid var(--theme-border)",
            }}
          >
            Close
          </button>,
        ];

  return (
    <>
      <ThemeStyles />
      <Modal
        isOpen={open}
        onClose={onClose}
        title=""
        contentClassName="w-[56rem] max-w-3xl"
        actions={actions}
      >
        <div className="border-none shadow-sm overflow-hidden">
          {/* Header */}
          <div
            className="px-5 py-4 sticky top-0 z-10"
            style={{
              background:
                "linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-500) 100%)",
              color: "var(--theme-on-primary)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,.18)" }}
                >
                  <MessageSquare size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold leading-5">SMS — Send & Logs</h3>
                  <p className="text-xs/5" style={{ opacity: 0.85 }}>
                    Send template SMS and review delivery logs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {TitleTabs}
                <button
                  onClick={onClose}
                  className="transition-colors"
                  style={{ color: "var(--theme-on-primary)" }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div
            className="p-5"
            style={{ background: "var(--theme-card)", color: "var(--theme-text)" }}
          >
            {/* SEND */}
            {tab === "send" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Template
                    </label>
                    {templates.length > 0 ? (
                      <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                        style={{
                          background: "var(--theme-card)",
                          color: "var(--theme-text)",
                          border: "1px solid var(--theme-border)",
                          outline: "none",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 0 0 3px var(--theme-primary-soft)")
                        }
                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                      >
                        <option value="">Select template</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} (#{t.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                        style={{
                          background: "var(--theme-card)",
                          color: "var(--theme-text)",
                          border: "1px solid var(--theme-border)",
                          outline: "none",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 0 0 3px var(--theme-primary-soft)")
                        }
                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                        placeholder="Template ID (e.g., 1)"
                      />
                    )}
                    {loadingTemplates && (
                      <p className="text-xs mt-1" style={{ color: "var(--theme-muted)" }}>
                        Loading templates…
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Recipient Phone
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm"
                      style={{
                        background: "var(--theme-card)",
                        color: "var(--theme-text)",
                        border: "1px solid var(--theme-border)",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 0 0 3px var(--theme-primary-soft)")
                      }
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                      placeholder="10-digit mobile"
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--theme-muted)" }}>
                      Lead: {leadName || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Message Override (optional)
                  </label>
                  <textarea
                    value={messageOverride}
                    onChange={(e) => setMessageOverride(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl px-3 py-2 text-sm"
                    style={{
                      background: "var(--theme-card)",
                      color: "var(--theme-text)",
                      border: "1px solid var(--theme-border)",
                      outline: "none",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.boxShadow =
                        "0 0 0 3px var(--theme-primary-soft)")
                    }
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    placeholder="Leave empty to use the template body"
                  />
                </div>

                {lastResponse && (
                  <div
                    className="mt-2 rounded-xl p-3"
                    style={{
                      background: "var(--theme-panel)",
                      border: "1px solid var(--theme-border)",
                    }}
                  >
                    <div className="text-sm font-semibold mb-1">
                      Last Response Summary
                    </div>
                    <div className="text-sm space-y-1" style={{ color: "var(--theme-text)" }}>
                      <div>
                        <strong>Message:</strong>{" "}
                        {lastResponse.gateway_response?.message || "-"}
                      </div>
                      <div>
                        <strong>Template:</strong> {lastResponse.template_title} (#{templateId})
                      </div>
                      <div>
                        <strong>Recipients:</strong>{" "}
                        {(lastResponse.recipients || []).join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LOGS */}
            {tab === "logs" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, start_date: e.target.value }))
                      }
                      className="w-full rounded-xl px-3 py-2 text-sm"
                      style={{
                        background: "var(--theme-card)",
                        color: "var(--theme-text)",
                        border: "1px solid var(--theme-border)",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 0 0 3px var(--theme-primary-soft)")
                      }
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, end_date: e.target.value }))
                      }
                      className="w-full rounded-xl px-3 py-2 text-sm"
                      style={{
                        background: "var(--theme-card)",
                        color: "var(--theme-text)",
                        border: "1px solid var(--theme-border)",
                        outline: "none",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 0 0 3px var(--theme-primary-soft)")
                      }
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    />
                  </div>
                  <div className="md:col-span-1 flex gap-2">
                    <button
                      onClick={() => {
                        const p = { ...filters, offset: 0 };
                        setFilters(p);
                        fetchLogs(p);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl"
                      style={{
                        background: "var(--theme-primary)",
                        color: "var(--theme-on-primary)",
                      }}
                    >
                      <Search size={16} /> Search
                    </button>
                    <button
                      onClick={() => {
                        const p = {
                          user_id: "",
                          template_id: "",
                          phone: leadMobile || "",
                          start_date: "",
                          end_date: "",
                          limit: 50,
                          offset: 0,
                        };
                        setFilters(p);
                        fetchLogs(p);
                      }}
                      className="px-3 py-2 rounded-xl"
                      style={{
                        background: "var(--theme-panel)",
                        color: "var(--theme-text)",
                        border: "1px solid var(--theme-border)",
                      }}
                      title="Reset"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--theme-border)" }}
                >
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm" style={{ color: "var(--theme-text)" }}>
                      <thead
                        className="sticky top-0"
                        style={{
                          background: "var(--theme-panel)",
                          color: "var(--theme-text)",
                        }}
                      >
                        <tr>
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Template</th>
                          <th className="text-left p-2">Phone</th>
                          <th className="text-left p-2">Body</th>
                          <th className="text-left p-2">Sent At</th>
                          <th className="text-left p-2">User</th>
                          <th className="text-left p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingLogs ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-4 text-center"
                              style={{ color: "var(--theme-muted)" }}
                            >
                              Loading…
                            </td>
                          </tr>
                        ) : logs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-4 text-center"
                              style={{ color: "var(--theme-muted)" }}
                            >
                              No logs found
                            </td>
                          </tr>
                        ) : (
                          logs.map((row) => (
                            <tr key={row.id} style={{ borderTop: `1px solid var(--theme-border)` }}>
                              <td className="p-2">{row.id}</td>
                              <td className="p-2">
                                {row.template_title} (#{row.template_id})
                              </td>
                              <td className="p-2">{row.recipient_phone_number}</td>
                              <td className="p-2">
                                <pre className="whitespace-pre-wrap break-words">
                                  {row.body
                                    ?.split(" ")
                                    .slice(0, 2)
                                    .join(" ") +
                                    (row.body?.split(" ").length > 2 ? "..." : "")}
                                </pre>
                              </td>

                              <td className="p-2">{fmtDateTime(row.sent_at)}</td>
                              <td className="p-2">{row.user_id}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => handleResend(row)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg"
                                  style={{
                                    color: "var(--theme-primary)",
                                    background: "var(--theme-primary-softer)",
                                  }}
                                  title="Resend same SMS"
                                >
                                  <RefreshCcw size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div
                    className="flex items-center justify-between p-2"
                    style={{
                      background: "var(--theme-panel)",
                      color: "var(--theme-text)",
                      borderTop: "1px solid var(--theme-border)",
                    }}
                  >
                    <div className="text-xs" style={{ color: "var(--theme-muted)" }}>
                      Showing {logs.length} / {total}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={prevPage}
                        disabled={filters.offset <= 0}
                        className="px-3 py-1 rounded-lg disabled:opacity-50"
                        style={{
                          background: "var(--theme-panel)",
                          color: "var(--theme-text)",
                          border: "1px solid var(--theme-border)",
                        }}
                      >
                        Prev
                      </button>
                      <button
                        onClick={nextPage}
                        disabled={
                          (filters.offset || 0) + (filters.limit || 50) >= total
                        }
                        className="px-3 py-1 rounded-lg disabled:opacity-50"
                        style={{
                          background: "var(--theme-panel)",
                          color: "var(--theme-text)",
                          border: "1px solid var(--theme-border)",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
