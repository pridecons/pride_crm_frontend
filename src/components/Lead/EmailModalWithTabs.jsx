"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { toast } from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { Loader2, Mail, List } from "lucide-react";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { ErrorHandling } from "@/helper/ErrorHandling";

const extractPlaceholders = (body = "") => {
  const regex = /{{(.*?)}}/g;
  let match;
  const fields = [];
  while ((match = regex.exec(body)) !== null) {
    fields.push(match[1].trim());
  }
  return Array.from(new Set(fields));
};

const EmailModalWithLogs = ({ open, onClose, leadEmail, leadName = "" }) => {
  const [tab, setTab] = useState("send"); // "send" | "logs"

  // Send Email
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [contextFields, setContextFields] = useState([]);
  const [emailContext, setEmailContext] = useState({});
  const [sending, setSending] = useState(false);

  // Logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load templates
  useEffect(() => {
    if (!(open && tab === "send")) return;

    let isActive = true;
    (async () => {
      try {
        setTemplates([]);
        setSelectedTemplateId("");
        setContextFields([]);
        setEmailContext({});

        const res = await axiosInstance.get("/email/templates/");
        if (!isActive) return;
        setTemplates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to load email templates" });
      }
    })();

    return () => { isActive = false; };
  }, [open, tab]);

  // Load logs
  useEffect(() => {
    if (!(open && tab === "logs" && leadEmail)) return;

    let isActive = true;
    (async () => {
      setLogs([]);
      setLogsLoading(true);
      try {
        const res = await axiosInstance.get("/email/logs/", { params: { recipient_email: leadEmail } });
        if (!isActive) return;
        setLogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to load email logs" });
      } finally {
        if (isActive) setLogsLoading(false);
      }
    })();

    return () => { isActive = false; };
  }, [open, tab, leadEmail]);

  // On template change, compute placeholders
  useEffect(() => {
    if (selectedTemplateId && templates.length) {
      const selected = templates.find((t) => t.id === Number(selectedTemplateId));
      if (selected) {
        const combined = `${selected.subject || ""} ${selected.body || ""}`;
        setContextFields(extractPlaceholders(combined));
        setEmailContext({});
      }
    } else {
      setContextFields([]);
    }
  }, [selectedTemplateId, templates]);

  const handleSendEmail = async () => {
    if (!selectedTemplateId) return ErrorHandling({ defaultError: "Select a template" });
    if (contextFields.some((f) => !emailContext[f])) {
      ErrorHandling({ defaultError: "Fill all required fields" });
      return;
    }
    setSending(true);
    try {
      await axiosInstance.post("/email/send", {
        template_id: selectedTemplateId,
        recipient_email: leadEmail,
        context: emailContext,
      });
      toast.success("Email sent!");

      // refresh logs after send
      setTab("logs");
      setSelectedTemplateId("");
      setContextFields([]);
      setEmailContext({});

      setLogsLoading(true);
      try {
        const res = await axiosInstance.get("/email/logs/", { params: { recipient_email: leadEmail } });
        setLogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to refresh logs" });
      } finally {
        setLogsLoading(false);
      }
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to send email" });
    } finally {
      setSending(false);
    }
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTab("send");
      setSelectedTemplateId("");
      setContextFields([]);
      setEmailContext({});
      setLogs([]);
      setLogsLoading(false);
    }
  }, [open]);

  const TitleTabs = (
    <div className="flex items-center gap-2">
      <button
        className={`px-3 py-1 rounded-full text-sm border ${tab === "send"
            ? "bg-white text-blue-700 border-white"
            : "bg-white/10 text-white/90 border-white/30 hover:bg-white/20"
          }`}
        onClick={() => setTab("send")}
        type="button"
      >
        Send
      </button>
      <button
        className={`px-3 py-1 rounded-full text-sm border ${tab === "logs"
            ? "bg-white text-blue-700 border-white"
            : "bg-white/10 text-white/90 border-white/30 hover:bg-white/20"
          }`}
        onClick={() => setTab("logs")}
        type="button"
      >
        Logs
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      contentClassName="w-[56rem] max-w-3xl"
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>,
        tab === "send" && (
          <button
            key="send"
            onClick={handleSendEmail}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : null}
            Send
          </button>
        ),
      ].filter(Boolean)}
    >
      <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Mail size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">Email — Send & Logs</h3>
                <p className="text-xs/5 text-white/80">
                  Send templated emails and review history for {leadName || "lead"}
                </p>
              </div>
            </div>
            {TitleTabs}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-white">
          {tab === "send" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Email Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={sending}
                >
                  <option value="">-- Select Template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {(template.subject || "").replace(/{{.*?}}/g, "").trim() ? `(${(template.subject || "").replace(/{{.*?}}/g, "").trim()})` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">To: {leadEmail || "-"}</p>
              </div>

              {contextFields.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-gray-700">Fill Template Data</h4>
                  {contextFields.map((field) => (
                    <div key={field} className="mb-3">
                      <label className="block text-xs font-medium mb-1 capitalize">{field}</label>
                      <input
                        type="text"
                        value={emailContext[field] || ""}
                        onChange={(e) =>
                          setEmailContext((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder={`Enter ${field}`}
                        disabled={sending}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {logsLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="animate-spin" size={24} />{" "}
                  <span className="ml-2">Loading logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No logs available for this recipient.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border rounded-xl hover:bg-gray-50 cursor-pointer"
                      onClick={async () => {
                        try {
                          const { data } = await axiosInstance.get(`/email/logs/${log.id}`);
                          toast(
                            <div>
                              <div className="font-bold mb-1">{data.subject}</div>
                              <div className="text-xs mb-1">To: {data.recipient_email}</div>
                              <div className="text-xs">Sent: {new Date(data.sent_at).toLocaleString()}</div>
                              <hr className="my-2" />
                              <div className="text-sm whitespace-pre-wrap">{data.body}</div>
                            </div>,
                            { duration: 8000 }
                          );
                        } catch (err) {
                          ErrorHandling({ error: err, defaultError: "Failed to load log details" });
                        }
                      }}
                    >
                      <p className="text-sm font-medium text-gray-800">{log.subject}</p>
                      <p className="text-xs text-gray-500">Sent at: {new Date(log.sent_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EmailModalWithLogs;