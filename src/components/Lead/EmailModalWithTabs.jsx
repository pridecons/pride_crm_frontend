"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { toast } from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { Loader2, Mail, List } from "lucide-react";

const extractPlaceholders = (body = "") => {
  const regex = /{{(.*?)}}/g;
  let match;
  const fields = [];
  while ((match = regex.exec(body)) !== null) {
    fields.push(match[1].trim());
  }
  return Array.from(new Set(fields));
};

const EmailModalWithLogs = ({
  open,
  onClose,
  leadEmail,
  leadName = "",
}) => {
  // Tab state
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

  // Fetch email templates when modal opens (send tab)
  useEffect(() => {
    if (open && tab === "send") {
      setTemplates([]);
      setSelectedTemplateId("");
      setContextFields([]);
      setEmailContext({});
      axiosInstance.get("/email/templates/")
        .then(res => setTemplates(res.data))
        .catch(() => toast.error("Failed to load email templates"));
    }
  }, [open, tab]);

  // Fetch email logs when logs tab opens
  useEffect(() => {
    if (open && tab === "logs" && leadEmail) {
      setLogs([]);
      setLogsLoading(true);
      axiosInstance.get("/email/logs/", {
        params: { recipient_email: leadEmail }
      })
        .then(res => setLogs(res.data))
        .catch(() => toast.error("Failed to load email logs"))
        .finally(() => setLogsLoading(false));
    }
  }, [open, tab, leadEmail]);

  // When template changes, extract placeholders
  useEffect(() => {
    if (selectedTemplateId && templates.length) {
      const selected = templates.find(t => t.id === Number(selectedTemplateId));
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
    if (!selectedTemplateId) {
      toast.error("Select a template");
      return;
    }
    if (contextFields.some((f) => !emailContext[f])) {
      toast.error("Fill all required fields");
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
      setTab("logs");
      setSelectedTemplateId("");
      setContextFields([]);
      setEmailContext({});
      // Optionally reload logs
      setLogsLoading(true);
      axiosInstance.get("/email/logs/", {
        params: { recipient_email: leadEmail }
      })
        .then(res => setLogs(res.data))
        .finally(() => setLogsLoading(false));
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  // Reset everything on close
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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={
        <div className="flex gap-3 items-center">
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded-t-lg transition-all text-sm font-medium border-b-2 ${
              tab === "send"
                ? "text-blue-600 border-blue-600 bg-blue-50"
                : "text-gray-600 border-transparent"
            }`}
            onClick={() => setTab("send")}
            type="button"
          >
            <Mail size={16} /> Send Email
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded-t-lg transition-all text-sm font-medium border-b-2 ${
              tab === "logs"
                ? "text-orange-600 border-orange-600 bg-orange-50"
                : "text-gray-600 border-transparent"
            }`}
            onClick={() => setTab("logs")}
            type="button"
          >
            <List size={16} /> Email Logs
          </button>
        </div>
      }
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Close
        </button>,
        tab === "send" && (
          <button
            key="send"
            onClick={handleSendEmail}
            disabled={sending}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin inline mr-2" size={16}/> : null}
            Send
          </button>
        ),
      ].filter(Boolean)}
      widthClass="max-w-lg"
    >
      {/* TABS */}
      {tab === "send" ? (
        <div className="space-y-4 pt-2">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Select Email Template</label>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded"
              disabled={sending}
            >
              <option value="">-- Select Template --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.subject.replace(/{{.*?}}/g, '').trim()})
                </option>
              ))}
            </select>
          </div>
          {/* Context fields */}
          {contextFields.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-gray-700">Fill Template Data</h4>
              {contextFields.map((field) => (
                <div key={field} className="mb-3">
                  <label className="block text-xs font-medium mb-1 capitalize">{field}</label>
                  <input
                    type="text"
                    value={emailContext[field] || ""}
                    onChange={e => setEmailContext(prev => ({
                      ...prev,
                      [field]: e.target.value
                    }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder={`Enter ${field}`}
                    disabled={sending}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // LOGS
        <div className="pt-2">
          {logsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin" size={24} /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No logs available for this recipient.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={async () => {
                    try {
                      const { data } = await axiosInstance.get(`/email/logs/${log.id}`);
                      toast(
                        <div>
                          <div className="font-bold mb-1">{data.subject}</div>
                          <div className="text-xs mb-1">To: {data.recipient_email}</div>
                          <div className="text-xs">Sent: {new Date(data.sent_at).toLocaleString()}</div>
                          <hr className="my-2"/>
                          <div className="text-sm">{data.body}</div>
                        </div>,
                        { duration: 8000 }
                      );
                    } catch {
                      toast.error("Failed to load log details");
                    }
                  }}
                >
                  <p className="text-sm font-medium text-gray-800">{log.subject}</p>
                  <p className="text-xs text-gray-500">
                    Sent at: {new Date(log.sent_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EmailModalWithLogs;