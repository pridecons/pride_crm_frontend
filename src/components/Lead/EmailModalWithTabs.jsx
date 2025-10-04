"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { toast } from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { Loader2, Mail, List, X } from "lucide-react";
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

    return () => {
      isActive = false;
    };
  }, [open, tab]);


  // useEffect(() => {
  //   if (!(open && tab === "logs" && leadEmail)) return;

  //   let isActive = true;
  //   (async () => {
  //     setLogs([]);
  //     setLogsLoading(true);
  //     try {
  //       const res = await axiosInstance.get("/email/logs/", {
  //         params: { recipient_email: leadEmail },
  //       });
  //       if (!isActive) return;
  //       setLogs(Array.isArray(res.data) ? res.data : []);
  //     } catch (err) {
  //       ErrorHandling({ error: err, defaultError: "Failed to load email logs" });
  //     } finally {
  //       if (isActive) setLogsLoading(false);
  //     }
  //   })();

  //   return () => {
  //     isActive = false;
  //   };
  // }, [open, tab, leadEmail]);

  
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
  if (!selectedTemplateId) {
    return ErrorHandling({ defaultError: "Select a template" });
  }

  if (contextFields.some((f) => !emailContext[f])) {
    ErrorHandling({ defaultError: "Fill all required fields" });
    return;
  }

  setSending(true);

  try {
    // Send the email
    await axiosInstance.post("/email/send", {
      template_id: selectedTemplateId,
      recipient_email: leadEmail,
      context: emailContext,
    });

    toast.success("Email sent!");

    // Reset states
    setTab("logs");
    setSelectedTemplateId("");
    setContextFields([]);
    setEmailContext({});

    // Refresh logs
    setLogsLoading(true);
    try {
      const response = await axiosInstance.get("/reports/email", {
        params: {
          lead_id: leadId, // <-- make sure you pass the lead id here
          skip: 0,
          limit: 50,
        },
      });

      setLogs(Array.isArray(response.data) ? response.data : []);
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
  // useEffect(() => {
  //   if (!open) {
  //     setTab("send");
  //     setSelectedTemplateId("");
  //     setContextFields([]);
  //     setEmailContext({});
  //     setLogs([]);
  //     setLogsLoading(false);
  //   }
  // }, [open]);

  const TitleTabs = (
    <div className="flex items-center gap-2">
      <button
        style={{
          background:
            tab === "send"
              ? "var(--theme-card-bg)"
              : "color-mix(in srgb, var(--theme-card-bg) 10%, transparent)",
          color: tab === "send" ? "var(--theme-primary)" : "var(--theme-card-bg)",
          border: "1px solid rgba(255,255,255,0.35)",
        }}
        className="px-3 py-1 rounded-full text-sm"
        onClick={() => setTab("send")}
        type="button"
      >
        Send
      </button>
      <button
        style={{
          background:
            tab === "logs"
              ? "var(--theme-card-bg)"
              : "color-mix(in srgb, var(--theme-card-bg) 10%, transparent)",
          color: tab === "logs" ? "var(--theme-primary)" : "var(--theme-card-bg)",
          border: "1px solid rgba(255,255,255,0.35)",
        }}
        className="px-3 py-1 rounded-full text-sm"
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
          className="px-4 py-2 rounded-xl"
          style={{
            border: `1px solid var(--theme-border)`,
            color: "var(--theme-text)",
            background: "var(--theme-card-bg)",
          }}
        >
          Close
        </button>,
        tab === "send" && (
          <button
            key="send"
            onClick={handleSendEmail}
            disabled={sending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50"
            style={{
              background: "var(--theme-primary)",
              color: "var(--theme-primary-contrast, #fff)",
            }}
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : null}
            Send
          </button>
        ),
      ].filter(Boolean)}
    >
      <div
        className="overflow-hidden"
        // style={{ borderColor: "var(--theme-border)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 text-white"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-primary) 90%, #0000), color-mix(in srgb, var(--theme-primary) 70%, #ffffff 10%), color-mix(in srgb, var(--theme-primary) 55%, #ffffff 20%))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur"
                style={{
                  background: "color-mix(in srgb, #ffffff 18%, transparent)",
                }}
              >
                <Mail size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold leading-5">
                  Email — Send & Logs
                </h3>
                <p
                  className="text-xs/5"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  Send templated emails and review history for{" "}
                  {leadName || "lead"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {TitleTabs}
              <button
                onClick={onClose}
                className="transition-colors"
                style={{ color: "#fff" }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="p-5"
          style={{ background: "var(--theme-card-bg)", color: "var(--theme-text)" }}
        >
          {tab === "send" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Email Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{
                    border: `1px solid var(--theme-border)`,
                    background: "var(--theme-card-bg)",
                    color: "var(--theme-text)",
                    outline: "none",
                    boxShadow: "0 0 0 0px transparent",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 0 0 3px color-mix(in srgb, var(--theme-primary) 20%, transparent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.boxShadow = "0 0 0 0px transparent")
                  }
                  disabled={sending}
                >
                  <option value="">-- Select Template --</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}{" "}
                      {(template.subject || "")
                        .replace(/{{.*?}}/g, "")
                        .trim()
                        ? `(${(template.subject || "")
                            .replace(/{{.*?}}/g, "")
                            .trim()})`
                        : ""}
                    </option>
                  ))}
                </select>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--theme-muted)" }}
                >
                  To: {leadEmail || "-"}
                </p>
              </div>

              {contextFields.length > 0 && (
                <div>
                  <h4
                    className="text-xs font-medium mb-2"
                    style={{ color: "var(--theme-text)" }}
                  >
                    Fill Template Data
                  </h4>
                  {contextFields.map((field) => (
                    <div key={field} className="mb-3">
                      <label className="block text-xs font-medium mb-1 capitalize">
                        {field}
                      </label>
                      <input
                        type="text"
                        value={emailContext[field] || ""}
                        onChange={(e) =>
                          setEmailContext((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm placeholder-opacity-70"
                        style={{
                          border: `1px solid var(--theme-border)`,
                          background: "var(--theme-card-bg)",
                          color: "var(--theme-text)",
                          outline: "none",
                          boxShadow: "0 0 0 0px transparent",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 0 0 3px color-mix(in srgb, var(--theme-primary) 20%, transparent)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.boxShadow =
                            "0 0 0 0px transparent")
                        }
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
                <div
                  className="flex items-center justify-center py-12"
                  style={{ color: "var(--theme-muted)" }}
                >
                  <Loader2 className="animate-spin" size={24} />{" "}
                  <span className="ml-2">Loading logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div
                  className="py-12 text-center"
                  style={{ color: "var(--theme-muted)" }}
                >
                  No logs available for this recipient.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl cursor-pointer"
                      style={{
                        border: `1px solid var(--theme-border)`,
                        background: "var(--theme-card-bg)",
                      }}
                      onClick={async () => {
                        try {
                          const { data } = await axiosInstance.get(
                            `/email/logs/${log.id}`
                          );
                          toast(
                            <div>
                              <div className="font-bold mb-1">{data.subject}</div>
                              <div className="text-xs mb-1">
                                To: {data.recipient_email}
                              </div>
                              <div className="text-xs">
                                Sent:{" "}
                                {new Date(data.sent_at).toLocaleString()}
                              </div>
                              <hr className="my-2" />
                              <div className="text-sm whitespace-pre-wrap">
                                {data.body}
                              </div>
                            </div>,
                            { duration: 8000 }
                          );
                        } catch (err) {
                          ErrorHandling({
                            error: err,
                            defaultError: "Failed to load log details",
                          });
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "color-mix(in srgb, var(--theme-primary) 5%, var(--theme-card-bg))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--theme-card-bg)";
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: "var(--theme-text)" }}>
                        {log.subject}
                      </p>
                      <p className="text-xs" style={{ color: "var(--theme-muted)" }}>
                        Sent at: {new Date(log.sent_at).toLocaleString()}
                      </p>
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
