"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { Modal } from "@/components/Lead/ID/Modal";
import { Send, RefreshCcw, Search, ListFilter, MessageSquare } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";

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
        const { data } = await axiosInstance.get("/sms-templates/?skip=0&limit=200");
        const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setTemplates(arr.map((t) => ({ id: t.id, label: t.title || t.name || `Template #${t.id}` })));
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
       ErrorHandling({defaultError: "Template & phone are required"});
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
      setFilters((prev) => ({ ...prev, phone: payload.phone_number, offset: 0 }));
      await fetchLogs({ ...filters, phone: payload.phone_number, offset: 0 });
    } catch (err) {
       ErrorHandling({ error: err, defaultError: "Failed to send SMS"});
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
       ErrorHandling({ error: err, defaultError: "Failed to load SMS logs"});
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
      ErrorHandling({ error: err, defaultError: "Failed to resend"});
    }
  };

  const TitleTabs = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setTab("send")}
        className={`px-3 py-1 rounded-full text-sm border ${
          tab === "send"
            ? "bg-white text-blue-700 border-white"
            : "bg-white/10 text-white/90 border-white/30 hover:bg-white/20"
        }`}
      >
        Send
      </button>
      <button
        onClick={() => setTab("logs")}
        className={`px-3 py-1 rounded-full text-sm border ${
          tab === "logs"
            ? "bg-white text-blue-700 border-white"
            : "bg-white/10 text-white/90 border-white/30 hover:bg-white/20"
        }`}
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
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>,
          <button
            key="send"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? "Sending..." : "Send SMS"}
          </button>,
        ]
      : [
          <button
            key="close"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>,
        ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      contentClassName="w-[56rem] max-w-3xl"
      actions={actions}
    >
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <MessageSquare size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">SMS — Send & Logs</h3>
                <p className="text-xs/5 text-white/80">Send template SMS and review delivery logs</p>
              </div>
            </div>
            {TitleTabs}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-white">
          {/* SEND */}
          {tab === "send" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template</label>
                  {templates.length > 0 ? (
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Template ID (e.g., 1)"
                    />
                  )}
                  {loadingTemplates && (
                    <p className="text-xs text-gray-500 mt-1">Loading templates…</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Recipient Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="10-digit mobile"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lead: {leadName || "-"}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message Override (optional)</label>
                <textarea
                  value={messageOverride}
                  onChange={(e) => setMessageOverride(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Leave empty to use the template body"
                />
              </div>

              {lastResponse && (
                <div className="mt-2 border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm font-semibold mb-1">Last Response Summary</div>
                  <div className="text-sm text-gray-700 space-y-1">
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
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <input
                    value={filters.user_id}
                    onChange={(e) => setFilters((p) => ({ ...p, user_id: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g., Admin001"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Template ID</label>
                  <input
                    type="number"
                    value={filters.template_id}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, template_id: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g., 1"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    value={filters.phone}
                    onChange={(e) => setFilters((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g., 8225852720"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="md:col-span-1 flex gap-2">
                  <button
                    onClick={() => {
                      const p = { ...filters, offset: 0 };
                      setFilters(p);
                      fetchLogs(p);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
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
                    className="px-3 py-2 bg-gray-200 rounded-xl hover:bg-gray-300"
                    title="Reset"
                  >
                    <ListFilter size={16} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
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
                          <td colSpan={7} className="p-4 text-center text-gray-500">
                            Loading…
                          </td>
                        </tr>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-500">
                            No logs found
                          </td>
                        </tr>
                      ) : (
                        logs.map((row) => (
                          <tr key={row.id} className="border-t">
                            <td className="p-2">{row.id}</td>
                            <td className="p-2">{row.template_title} (#{row.template_id})</td>
                            <td className="p-2">{row.recipient_phone_number}</td>
                            <td className="p-2">
                              <pre className="whitespace-pre-wrap break-words">{row.body}</pre>
                            </td>
                            <td className="p-2">{fmtDateTime(row.sent_at)}</td>
                            <td className="p-2">{row.user_id}</td>
                            <td className="p-2">
                              <button
                                onClick={() => handleResend(row)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                title="Resend same SMS"
                              >
                                <RefreshCcw size={14} /> Resend
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-2 bg-gray-50">
                  <div className="text-xs text-gray-600">Showing {logs.length} / {total}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={prevPage}
                      disabled={filters.offset <= 0}
                      className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={nextPage}
                      disabled={filters.offset + (filters.limit || 50) >= total}
                      className="px-3 py-1 bg-gray-200 rounded-lg disabled:opacity-50"
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
  );
}
