"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  Eye,
  Mail,
  Mic,
  FileText,
  FileText as InvoiceIcon,
  Send,
  Share2,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
// import CallButton from "../CallButton";

const btnBase =
  "flex items-center px-4 py-2 rounded-lg border font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed";

export function ActionButtons({
  currentLead,
  loading,
  onRefresh,
  onKycClick,
  kycLoading = false,
  kycSigningUrl,
  onCopyKycLink,
  onPaymentClick,
  onManualePaymentClick,
  onSendEmailClick,
  onSendSMSClick,
  onRecordingsClick,
  onViewKycClick,
  onDocumentsClick,
  onInvoiceClick,
  onShareClick,
}) {
  const { hasPermission } = usePermissions();

  const [copied, setCopied] = useState(false);


  const handleCopyClick = async () => {
    if (!onCopyKycLink || copied) return;
    const ok = await onCopyKycLink();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
    }
  };

  return (
    <div className="flex flex-wrap gap-3 mb-5 justify-center">
      {/* Call */}
      {/* <CallButton
        lead={currentLead}
        size="md"
        onRefresh={onRefresh}
        title={currentLead?.is_call ? "Called" : "Call"}
      >
        {currentLead?.is_call ? "Called" : "Call"}
      </CallButton> */}

      {/* Agreement / KYC */}
            {currentLead?.kyc ? (
        <button
          onClick={onViewKycClick}
          className={`${btnBase} border-blue-500 text-blue-600 hover:bg-blue-100`}
        >
          <Eye size={16} className="mr-2" />
          Agreement
        </button>
      ) : (
        <>
          <button
            onClick={onKycClick}
            disabled={kycLoading || !currentLead?.email}
            className={`${btnBase} border-purple-500 text-purple-600 hover:bg-purple-100`}
          >
            {kycLoading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <ShieldCheck size={16} className="mr-2" />
            )}
            KYC
          </button>
         {Boolean(kycSigningUrl) && (
           <button
             onClick={handleCopyClick}
             disabled={copied}
             className={`${btnBase} ${
               copied
                 ? "border-green-600 text-green-700 hover:bg-green-100"
                 : "border-emerald-500 text-emerald-600 hover:bg-emerald-100"
             }`}
             title={copied ? "Copied" : "Copy signing URL"}
             aria-live="polite"
           >
             {copied ? (
               <>
                 <Check size={16} className="mr-2" />
                 Copied
              </>
            ) : (
               <>
                 <Copy size={16} className="mr-2" />
                 Copy KYC Link
               </>
             )}
           </button>
         )}
        </>
      )}

      

      {/* Payment */}
      <button
        onClick={onPaymentClick}
        className={`${btnBase} border-red-500 text-red-600 hover:bg-red-100 rupee`}
      >
        ₹ Payment
      </button>
     {hasPermission("lead_manuale_payment_create") &&
      <button
        onClick={onManualePaymentClick}
        className={`${btnBase} border-red-500 text-red-600 hover:bg-red-100 rupee`}
      >
        ₹ Manuale Payment
      </button>
      }

      {/* Email */}
      <button
        onClick={onSendEmailClick}
        className={`${btnBase} border-orange-500 text-orange-600 hover:bg-orange-100`}
      >
        <Mail size={16} className="mr-2" />
        Email
      </button>

      {/* SMS */}
      <button
        onClick={onSendSMSClick}
        className={`${btnBase} border-sky-500 text-sky-600 hover:bg-sky-100`}
      >
        <Send size={16} className="mr-2" />
        SMS
      </button>

      {/* Recordings */}
      {hasPermission("lead_recording_view") && <button
        onClick={onRecordingsClick}
        className={`${btnBase} border-pink-500 text-pink-600 hover:bg-pink-100`}
      >
        <Mic size={16} className="mr-2" />
        Recordings
      </button>}

      {/* Documents */}
      <button
        onClick={onDocumentsClick}
        className={`${btnBase} border-yellow-500 text-yellow-600 hover:bg-yellow-100`}
      >
        <FileText size={16} className="mr-2" />
        Documents
      </button>

      {/* Invoices */}
      <button
        onClick={onInvoiceClick}
        className={`${btnBase} border-indigo-500 text-indigo-600 hover:bg-indigo-100`}
      >
        <InvoiceIcon size={16} className="mr-2" />
        Invoices
      </button>

      {/* Transfer */}
      {hasPermission("lead_transfer") && <button
        onClick={onShareClick}
        className={`${btnBase} border-purple-600 text-purple-700 hover:bg-purple-100`}
      >
        <Share2 size={16} className="mr-2" />
        Transfer
      </button>}
    </div>
  );
}
