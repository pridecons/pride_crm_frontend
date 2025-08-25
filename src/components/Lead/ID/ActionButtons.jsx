"use client";

import React from "react";
import {
  PhoneCall,
  Eye,
  Mail,
  Mic,
  FileText,
  FileText as InvoiceIcon,
  Send,
  Share2,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

const btnBase =
  "flex items-center px-4 py-2 rounded-lg border font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed";

export function ActionButtons({
  currentLead,
  loading,
  onCallClick,
  onKycClick,
  kycLoading = false,
  onPaymentClick,
  onSendEmailClick,
  onSendSMSClick,
  onRecordingsClick,
  onViewKycClick,
  onDocumentsClick,
  onInvoiceClick,
  onShareClick,
}) {
  const { hasPermission } = usePermissions();

  return (
    <div className="flex flex-wrap gap-3 mb-5 justify-center">
      {/* Call */}
      <button
        onClick={onCallClick}
        disabled={!currentLead || currentLead.is_call}
        className={`${btnBase} border-green-500 text-green-600 hover:bg-green-100`}
      >
        <PhoneCall size={16} className="mr-2" />
        {currentLead?.is_call ? "Called" : "Call"}
      </button>

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
        <button
          onClick={onKycClick}
          disabled={kycLoading || !currentLead?.email}
          className={`${btnBase} border-purple-500 text-purple-600 hover:bg-purple-100`}
        >
          {kycLoading && <span className="animate-spin mr-2">⏳</span>}
          KYC
        </button>
      )}

      {/* Payment */}
      <button
        onClick={onPaymentClick}
        className={`${btnBase} border-red-500 text-red-600 hover:bg-red-100`}
      >
        ₹ Payment
      </button>

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
     {hasPermission("lead_recording_view")&& <button
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
