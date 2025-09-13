// components/Lead/InvoiceModal.jsx
import React, { useEffect, useState } from "react";
import { CreditCard, FileText, Loader2 } from "lucide-react";
import { axiosInstance, BASE_URL } from "@/api/Axios";
import { Modal } from "./ID/Modal";
import { ErrorHandling } from "@/helper/ErrorHandling";

/**
 * InvoiceModal - Show all invoices for a lead in a modal
 *
 * Props:
 *   isOpen (bool) - show/hide modal
 *   onClose (fn) - close modal callback
 *   leadId (number|string) - Lead ID
 */
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
            title="Invoices"
            contentClassName="w-[80vw] max-w-4xl rounded-xl shadow-2xl bg-white flex flex-col"
            actions={[
                <button
                    key="close"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                    Close
                </button>,
            ]}
        >
            <div className="bg-white rounded-lg p-1">
                <div className="flex items-center mb-4 gap-2">
                    <FileText className="text-indigo-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-indigo-500" />
                    </div>
                ) : invoices.length === 0 ? (
                    // Show a formal message if there are no invoices
                    <div className="text-gray-500 py-8 text-center text-lg font-medium">
                        No invoices found for this lead.<br />
                        <span className="text-gray-400 text-sm font-normal">
                            Once a payment is made and an invoice is generated, it will appear here.
                        </span>
                    </div>
                ) : err ? (
                    // Show error only if actual error (not empty)
                    <div className="text-red-600 py-3">{err}</div>
                ) : (
                    <div className="overflow-y-auto" style={{ maxHeight: "45vh" }}>
                        <table className="w-full border rounded text-sm table-auto">
                            <thead>
                                <tr className="bg-gray-50 text-gray-700">
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
                                    <tr key={inv.id} className="border-b last:border-b-0">
                                        <td className="py-2 px-3">{i + 1}</td>
                                        <td className="py-2 px-3">{inv.invoice_no || <span className="text-gray-400">N/A</span>}</td>
                                        <td className="py-2 px-3">
                                            <span className="inline-flex items-center font-medium text-green-700">
                                                <CreditCard size={14} className="mr-1" />
                                                ₹{inv.paid_amount}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3">
                                            {inv.status === "PAID" ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Paid</span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">{inv.status}</span>
                                            )}
                                        </td>
                                        <td className="py-2 px-3">{formatDate(inv.created_at)}</td>
                                        <td className="py-2 px-3">
   {inv.invoice_path && inv.invoice_path !== "false" ? (
     <button
       type="button"
       onClick={() =>
         onViewPdf &&
         onViewPdf(
           getInvoiceUrl(inv.invoice_path),
           `Invoice #${inv.invoice_no ?? inv.id}`
         )
       }
       className="text-blue-600 hover:underline"
     >
       View
     </button>
   ) : (
     <span className="text-gray-400">N/A</span>
   )}
 </td>
                                        <td className="py-2 px-3">
                                            {inv.invoice_path && inv.invoice_path !== "false" ? (
                                                <button
                                                    onClick={() =>
                                                        handleDownload(getInvoiceUrl(inv.invoice_path), `invoice-${inv.id}.pdf`)
                                                    }
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Download
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
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

// Util: format ISO date as DD-MM-YYYY, fallback to time string if invalid
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