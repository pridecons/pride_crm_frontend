// components/Lead/InvoiceModal.jsx
"use client";
import React, { useEffect, useState } from "react";
import { CreditCard, FileText, Loader2 } from "lucide-react";
import { axiosInstance, BASE_URL } from "@/api/Axios";
import { Modal } from "./ID/Modal";
import { ErrorHandling } from "@/helper/ErrorHandling";

const InvoiceModal = ({ isOpen, onClose, leadId, onViewPdf, canDownload = false }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!isOpen || !leadId) return;
    setLoading(true);
    setErr(null);
    axiosInstance
      .get(`/invoices/lead/${leadId}`)
      .then((res) => setInvoices(res.data || []))
      .catch(() => {
        setErr("Failed to fetch invoices");
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, leadId]);

  const handleDownload = async (url, filename = "invoice.pdf") => {
    try {
      const res = await axiosInstance.get(url, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to download invoice" });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      // title intentionally empty (design choice)
      contentClassName="p-6 w-[80vw] max-w-4xl rounded-xl shadow-2xl flex flex-col"
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 rounded-lg"
          style={{
            background: "var(--theme-components-button-secondary-bg, var(--theme-surface))",
            color: "var(--theme-text)",
            border: `1px solid var(--theme-border)`,
          }}
        >
          Close
        </button>,
      ]}
    >
      <div
        className="rounded-lg p-1"
        style={{
          background: "var(--theme-components-card-bg)",
          color: "var(--theme-text)",
        }}
      >
        <div className="flex items-center mb-4 gap-2">
          <FileText size={20} style={{ color: "var(--theme-primary)" }} />
          <h3 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
            Invoices
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin" style={{ color: "var(--theme-primary)" }} />
          </div>
        ) : invoices.length === 0 ? (
          <div
            className="py-8 text-center text-lg font-medium"
            style={{ color: "var(--theme-textSecondary)" }}
          >
            No invoices found for this lead.
            <br />
            <span className="text-sm font-normal" style={{ color: "var(--theme-textMuted, var(--theme-textSecondary))" }}>
              Once a payment is made and an invoice is generated, it will appear here.
            </span>
          </div>
        ) : err ? (
          <div className="py-3" style={{ color: "var(--theme-error)" }}>
            {err}
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: "45vh" }}>
            <table
              className="w-full text-sm table-auto rounded"
              style={{
                border: `1px solid var(--theme-border)`,
                color: "var(--theme-text)",
              }}
            >
              <thead style={{ background: "var(--theme-surface)" }}>
                <tr style={{ color: "var(--theme-textSecondary)" }}>
                  <th className="py-2 px-3 text-left">#</th>
                  <th className="py-2 px-3 text-left">Invoice No</th>
                  <th className="py-2 px-3 text-left">Amount</th>
                  <th className="py-2 px-3 text-left">Status</th>
                  <th className="py-2 px-3 text-left">Created</th>
                  <th className="py-2 px-3 text-left">View</th>
                  <th className="py-2 px-3 text-left">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom: `1px solid var(--theme-border)`,
                      background: i % 2 ? "var(--theme-surface)" : "var(--theme-components-card-bg)",
                    }}
                  >
                    <td className="py-2 px-3">{i + 1}</td>
                    <td className="py-2 px-3">
                      {inv.invoice_no || <span style={{ color: "var(--theme-textSecondary)" }}>N/A</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className="inline-flex items-center font-medium"
                        style={{ color: "var(--theme-success)" }}
                      >
                        <CreditCard size={14} className="mr-1" />
                        ₹{inv.paid_amount}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {inv.status === "PAID" ? (
                        <span
                          className="px-2 py-1 rounded-full text-xs border"
                          style={{
                            background: "var(--theme-components-tag-success-bg, rgba(16,185,129,0.1))",
                            color: "var(--theme-success)",
                            borderColor: "var(--theme-components-tag-success-border, var(--theme-success))",
                          }}
                        >
                          Paid
                        </span>
                      ) : (
                        <span
                          className="px-2 py-1 rounded-full text-xs border"
                          style={{
                            background: "var(--theme-components-tag-warning-bg, rgba(245,158,11,0.1))",
                            color: "var(--theme-warning, #b45309)",
                            borderColor: "var(--theme-components-tag-warning-border, var(--theme-warning, #b45309))",
                          }}
                        >
                          {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">{formatDate(inv.created_at)}</td>
                    <td className="py-2 px-3">
                      {inv.invoice_path && inv.invoice_path !== "false" ? (
                        <button
                          type="button"
                          onClick={() =>
                            onViewPdf &&
                            onViewPdf(getInvoiceUrl(inv.invoice_path), `Invoice #${inv.invoice_no ?? inv.id}`)
                          }
                          className="underline"
                          style={{ color: "var(--theme-link, var(--theme-primary))" }}
                        >
                          View
                        </button>
                      ) : (
                        <span style={{ color: "var(--theme-textSecondary)" }}>N/A</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {inv.invoice_path && inv.invoice_path !== "false" ? (
                        <button
                          onClick={() => handleDownload(getInvoiceUrl(inv.invoice_path), `invoice-${inv.id}.pdf`)}
                          className="underline"
                          style={{ color: "var(--theme-link, var(--theme-primary))" }}
                        >
                          Download
                        </button>
                      ) : (
                        <span style={{ color: "var(--theme-textSecondary)" }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Util: format ISO date as DD-MM-YYYY, fallback to raw if invalid
function formatDate(dt) {
  if (!dt) return "-";
  const date = new Date(dt);
  if (isNaN(date)) return dt;
  return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getFullYear()}`;
}

// Util: resolve invoice download url
function getInvoiceUrl(path) {
  if (!path || path === "false") return null;
  if (path.startsWith("http")) return path;

  // Always remove any leading slash from path for joining
  let filename = path.replace(/^\/+/, "");

  // Remove "static/invoices/" if already present at the beginning of filename
  if (filename.startsWith("static/invoices/")) {
    filename = filename.slice("static/invoices/".length);
  }

  // Final absolute url
  return `${BASE_URL}/static/invoices/${filename}`;
}

export default InvoiceModal;
