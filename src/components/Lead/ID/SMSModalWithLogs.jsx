"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "@/components/Lead/ID/Modal";
import { Send, Search, MessageSquare, X } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { usePermissions } from "@/context/PermissionsContext";

/* ================================
   THEME (colors only)
   ================================ */
const ThemeStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
:root{
  --theme-primary:#4f46e5;
  --theme-primary-500:#6366f1;
  --theme-on-primary:#ffffff;
  --theme-accent:#6366f1;
  --theme-success:#16a34a;
  --theme-danger:#dc2626;
  --theme-card:#ffffff;
  --theme-panel:#f8fafc;
  --theme-border:#e5e7eb;
  --theme-text:#0f172a;
  --theme-muted:#64748b;
  --theme-muted-ink:#94a3b8;
  --theme-backdrop:rgba(11,18,32,.45);
  --theme-primary-soft:rgba(79,70,229,.07);
  --theme-primary-softer:rgba(79,70,229,.05);
  --theme-success-soft:rgba(22,163,74,.10);
  --theme-danger-soft:rgba(220,38,38,.10);
}
.dark{
  --theme-primary:#818cf8;
  --theme-primary-500:#a5b4fc;
  --theme-on-primary:#0b1220;
  --theme-accent:#a78bfa;
  --theme-success:#22c55e;
  --theme-danger:#ef4444;
  --theme-card:#0f172a;
  --theme-panel:#0b1220;
  --theme-border:#1f2937;
  --theme-text:#e5e7eb;
  --theme-muted:#9ca3af;
  --theme-muted-ink:#6b7280;
  --theme-backdrop:rgba(0,0,0,.55);
  --theme-primary-soft:rgba(129,140,248,.16);
  --theme-primary-softer:rgba(129,140,248,.10);
  --theme-success-soft:rgba(34,197,94,.14);
  --theme-danger-soft:rgba(239,68,68,.14);
}
  .bodyClamp{
  display:-webkit-box;
  -webkit-line-clamp:2;       /* show only 2 lines */
  -webkit-box-orient:vertical;
  overflow:hidden;
  white-space:pre-wrap;
  word-break:break-word;
}
  .btn{
  display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  height:40px; padding:0 .875rem; border-radius:12px;
  font-size:14px; font-weight:600; line-height:1; letter-spacing:.2px;
  border:1px solid var(--theme-border);
  background:var(--theme-card); color:var(--theme-text);
  transition:transform .06s ease, box-shadow .2s ease, background .2s ease, color .2s ease, border-color .2s ease;
}
.btn:hover{ transform:translateY(-1px); box-shadow:0 6px 16px rgba(15,23,42,.08); }
.btn:active{ transform:translateY(0); box-shadow:none; }
.btn:focus-visible{ outline:none; box-shadow:0 0 0 3px var(--theme-primary-soft); }
.btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }
.btn-primary{
  background:var(--theme-primary); color:var(--theme-on-primary);
  border-color:transparent;
}
.btn-primary:hover{ filter:brightness(1.03); }
.btn-outline{
  background:var(--theme-panel); color:var(--theme-text);
  border-color:var(--theme-border);
}
.btn-ghost{
  background:transparent; color:var(--theme-text);
  border-color:transparent;
}
.btn-icon{ width:40px; padding:0; }

.btn-group{ display:flex; align-items:center; gap:.5rem; }
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

const BodyPreview = ({ text = "" }) => {
  if (!text) return <span className="text-xs opacity-60">—</span>;

  return (
    // keep title so the native black tooltip shows the full message
    <div className="max-w-[420px]" title={text}>
      <pre className="bodyClamp text-[13px] leading-5 m-0">
        {text}
      </pre>
    </div>
  );
};


export default function SMSModalWithLogs({
  open,
  onClose,
  leadMobile = "",
  leadName = "",
  leadId = null, // <-- pass the lead_id here
}) {
  const { hasPermission } = usePermissions();
  const [tab, setTab] = useState("send"); // 'send' | 'logs'

  // ---- SEND TAB ----
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [phone, setPhone] = useState(leadMobile || "");
  const [messageOverride, setMessageOverride] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  // add with other useState hooks
  const [exporting, setExporting] = useState(false);

  // small helper to trigger a browser download
  const downloadBlob = (blob, filename = "sms_logs.xlsx") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // export handler (re-use current filters)
  const handleExport = async () => {
    try {
      setExporting(true);

      // Build params for the export endpoint
      const params = cleanParams({
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        lead_id: filters.lead_id || leadId || undefined,
        // backend supports a large cap via max_rows
        max_rows: 100000,
        // (optional extras; backend can ignore if not supported)
        status: filters.status || undefined,
        sms_type: filters.sms_type || undefined,
        template_id: filters.template_id || undefined,
        search: filters.search || undefined,
      });

      // NOTE: responseType 'blob' is required for files
      const res = await axiosInstance.get("/reports/sms/export.xlsx", {
        params,
        responseType: "blob",
      });

      // file name suggestion
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const nameParts = [
        "sms_logs",
        filters.lead_id || leadId ? `lead-${filters.lead_id || leadId}` : null,
        filters.date_from ? `from-${filters.date_from}` : null,
        filters.date_to ? `to-${filters.date_to}` : null,
        ts
      ].filter(Boolean).join("_") + ".xlsx";

      downloadBlob(res.data, nameParts);
      toast.success("Export generated");
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Export failed" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPhone(leadMobile || "");
    setLastResponse(null);
    (async () => {
      try {
        setLoadingTemplates(true);
        const { data } = await axiosInstance.get("/sms-templates/?skip=0&limit=200");
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        setTemplates(
          arr.map((t) => ({
            id: t.id,
            label: t.title || `Template #${t.id}`,
            body: t.template || "",
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
      const { data } = await axiosInstance.post("/sms-templates/send-sms", payload);
      setLastResponse(data);
      toast.success("SMS sent successfully");
      setTab("logs");

      // refresh logs for this lead if we have one
      setFilters((prev) => ({
        ...prev,
        // keep dates as-is, always show this lead when provided
        lead_id: leadId ?? prev.lead_id,
        skip: 0,
        offset: 0, // keep local offset in sync
      }));
      await fetchLogs({
        ...filters,
        lead_id: leadId ?? filters.lead_id,
        skip: 0,
        offset: 0,
      });
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to send SMS" });
    } finally {
      setSending(false);
    }
  };

  // ---- LOGS TAB (Reports endpoint) ----
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);

  /**
   * Filters mapped to /api/v1/reports/sms:
   * - date_from  (string, YYYY-MM-DD)
   * - date_to    (string, YYYY-MM-DD)
   * - lead_id    (number)
   * - status     (string | null)          // optional
   * - sms_type   (string | null)          // optional
   * - template_id(number | null)          // optional
   * - search     (string | null)          // optional
   * - skip       (number)
   * - limit      (number)
   *
   * We keep local `offset` for UI but send `skip` to API.
   */
  const [filters, setFilters] = useState({
    date_from: "",     // maps from your old "start_date"
    date_to: "",       // maps from your old "end_date"
    lead_id: leadId ?? "", // prefer explicit lead_id
    status: "",
    sms_type: "",
    template_id: "",
    search: "",
    limit: 50,
    skip: 0,
    offset: 0, // local-only helper to compute pages
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === String(templateId)),
    [templates, templateId]
  );
  const selectedTitle = selectedTemplate
    ? `${selectedTemplate.label} (#${selectedTemplate.id})`
    : "Select template";

  const fetchLogs = async (params = filters) => {
    try {
      setLoadingLogs(true);
      // Build query object for the reports endpoint
      const query = {
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        lead_id: params.lead_id || undefined,
        status: params.status || undefined,
        sms_type: params.sms_type || undefined,
        template_id: params.template_id || undefined,
        search: params.search || undefined,
        limit: params.limit ?? 50,
        skip: params.skip ?? params.offset ?? 0,
      };

      const { data } = await axiosInstance.get("/reports/sms", {
        params: cleanParams(query),
      });

      // Response shape:
      // { ok, total, skip, limit, items: [...] }
      setLogs(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total ?? 0));

      // Keep local skip/offset in sync with server
      setFilters((p) => ({
        ...p,
        skip: Number(data?.skip ?? query.skip ?? 0),
        offset: Number(data?.skip ?? query.skip ?? 0),
        limit: Number(data?.limit ?? query.limit ?? 50),
      }));
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to load SMS logs" });
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (tab === "logs") {
      // initialize lead_id if provided
      const init = {
        ...filters,
        lead_id: leadId ?? filters.lead_id,
      };
      setFilters(init);
      fetchLogs(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, leadId]);

  const nextPage = () => {
    const pageSize = filters.limit || 50;
    const newSkip = (filters.skip || 0) + pageSize;
    if (newSkip >= total) return;
    const p = { ...filters, skip: newSkip, offset: newSkip };
    setFilters(p);
    fetchLogs(p);
  };

  const prevPage = () => {
    const pageSize = filters.limit || 50;
    const newSkip = Math.max(0, (filters.skip || 0) - pageSize);
    const p = { ...filters, skip: newSkip, offset: newSkip };
    setFilters(p);
    fetchLogs(p);
  };

  const TitleTabs = (
    <div className="btn-group">
      <button
        onClick={() => setTab("send")}
        className={`btn ${tab === "send" ? "btn-primary" : "btn-outline"}`}
        style={{ height: 36 }}
      >
        Send
      </button>
      <button
        onClick={() => setTab("logs")}
        className={`btn ${tab === "logs" ? "btn-primary" : "btn-outline"}`}
        style={{ height: 36 }}
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
          className="btn btn-outline"
        >
          Close
        </button>,
        <button
          key="send"
          onClick={handleSend}
          disabled={!canSend}
          className="btn btn-primary"
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
                  <div className="min-w-0">
                    <label className="block text-sm font-medium mb-1">Template</label>
                    {templates.length > 0 ? (
                      <select
                        title={selectedTitle}           // <-- shows full text on hover
                        aria-label={selectedTitle}
                        value={templateId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setTemplateId(selectedId);
                          const st = templates.find((t) => String(t.id) === String(selectedId));
                          setMessageOverride(st?.body || "");
                        }}
                        onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--theme-primary-soft)")}
                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                        className="w-full rounded-xl px-3 py-2 text-sm truncate"
                        style={{
                          background: "var(--theme-card)",
                          color: "var(--theme-text)",
                          border: "1px solid var(--theme-border)",
                          outline: "none",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                        }}
                      >
                        <option value="">Select template</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id} title={t.label}>
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

                  <div className="min-w-0">
                    <label className="block text-sm font-medium mb-1">Recipient Phone</label>
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
                      disabled
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
                    disabled
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
                    <div className="text-sm font-semibold mb-1">Last Response Summary</div>
                    <div className="text-sm space-y-1" style={{ color: "var(--theme-text)" }}>
                      <div>
                        <strong>Message:</strong>{" "}
                        {lastResponse.gateway_response?.message || "-"}
                      </div>
                      <div>
                        <strong>Template:</strong> #{templateId}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, date_from: e.target.value }))
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
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, date_to: e.target.value }))
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
                    <div className="btn-group">
                      <button
                        onClick={() => {
                          const p = { ...filters, skip: 0, offset: 0 };
                          setFilters(p); fetchLogs(p);
                        }}
                        className="btn btn-primary"
                        title="Search"
                      >
                        <Search size={16} /> Search
                      </button>

                      <button
                        onClick={() => {
                          const p = {
                            date_from: "", date_to: "", lead_id: leadId ?? "",
                            status: "", sms_type: "", template_id: "", search: "",
                            limit: 50, skip: 0, offset: 0,
                          };
                          setFilters(p); fetchLogs(p);
                        }}
                        className="btn btn-outline"
                        title="Reset filters"
                      >
                        Reset
                      </button>

                      {hasPermission("sms_logs_export") && <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="btn btn-primary"
                        title="Download Excel"
                      >
                        {exporting ? "Exporting…" : "Export(.xlsx)"}
                      </button>}
                    </div>
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
                        style={{ background: "var(--theme-panel)", color: "var(--theme-text)" }}
                      >
                        <tr>
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Template ID</th>
                          <th className="text-left p-2">Phone</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Body</th>
                          <th className="text-left p-2">Sent At</th>
                          <th className="text-left p-2">User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingLogs ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center" style={{ color: "var(--theme-muted)" }}>
                              Loading…
                            </td>
                          </tr>
                        ) : logs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-4 text-center" style={{ color: "var(--theme-muted)" }}>
                              No logs found
                            </td>
                          </tr>
                        ) : (
                          logs.map((row) => (
                            <tr key={row.id} style={{ borderTop: `1px solid var(--theme-border)` }}>
                              <td className="p-2">{row.id}</td>
                              <td className="p-2">#{row.template_id}</td>
                              <td className="p-2">{row.recipient_phone_number}</td>
                              <td className="p-2">{row.status ?? "—"}</td>
                              <td className="p-2 align-top">
                                <BodyPreview text={row.body} />
                              </td>

                              <td className="p-2">{fmtDateTime(row.sent_at)}</td>
                              <td className="p-2">{row.user_id}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-2"
                    style={{
                      background: "var(--theme-panel)",
                      color: "var(--theme-text)",
                      borderTop: "1px solid var(--theme-border)",
                    }}
                  >
                    <div className="text-xs" style={{ color: "var(--theme-muted)" }}>
                      Showing {logs.length} / {total}
                    </div>

                    <div className="flex items-center gap-2">


                      {/* Pagination */}
                      <button
                        onClick={prevPage}
                        disabled={(filters.skip || 0) <= 0}
                        className="btn btn-outline"
                      >
                        Prev
                      </button>
                      <button
                        onClick={nextPage}
                        disabled={(filters.skip || 0) + (filters.limit || 50) >= total}
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
