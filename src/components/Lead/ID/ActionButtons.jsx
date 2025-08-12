// components/Lead/ActionButtons.jsx
"use client";

import React from "react";
import { PhoneCall, Edit3, X, Eye, Mail, MessageCircle, Mic, FileText, BookOpenText, FileText as InvoiceIcon } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";

export function ActionButtons({
  currentLead,
  isEditMode,
  loading,
  onCallClick,
  onEditClick,
  onSaveClick,
  onKycClick,
  kycLoading = false,
  onPaymentClick,
  onSendEmailClick,
  onCommentsClick,
  onRecordingsClick,
  onViewKycClick,
  onDocumentsClick,
  onStoryClick,
  onInvoiceClick,
}) {
  const { hasPermission } = usePermissions();

  return (
    <div className="flex justify-evenly flex-wrap gap-2 mb-5">
      <button
        onClick={onCallClick}
        disabled={!currentLead || currentLead.is_call}
        className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
          currentLead?.is_call
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        <PhoneCall size={16} className="mr-2" />
        {currentLead?.is_call ? "Called" : "Call"}
      </button>

      {currentLead?.kyc && (
        <button
          onClick={onViewKycClick}
          className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Eye size={16} className="mr-2" />
          Agreement
        </button>
      )}

      {!currentLead?.kyc && (
        <button
          onClick={onKycClick}
          disabled={kycLoading || !currentLead?.email}
          className="flex items-center px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {kycLoading && <span className="animate-spin mr-2">⏳</span>}
          KYC
        </button>
      )}

      <button
        onClick={onPaymentClick}
        className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        ₹ Payment
      </button>

      <button
        onClick={onSendEmailClick}
        className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Mail size={16} className="mr-2" />
        Email
      </button>

      <button
        onClick={onCommentsClick}
        className="flex items-center px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
      >
        <MessageCircle size={16} className="mr-2" />
        Comments
      </button>

      {hasPermission("lead_recording_view") && (
        <button
          onClick={onRecordingsClick}
          className="flex items-center px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          <Mic size={16} className="mr-2" />
          Recordings
        </button>
      )}

      <button
        onClick={onDocumentsClick}
        className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
      >
        <FileText size={16} className="mr-2" />
        Documents
      </button>

      <button
        onClick={onStoryClick}
        className="flex items-center px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      >
        <BookOpenText size={16} className="mr-2" />
        Story
      </button>

      <button
        onClick={onInvoiceClick}
        className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <InvoiceIcon size={16} className="mr-2" />
        Invoices
      </button>
      
      <button
        onClick={onEditClick}
        disabled={!currentLead}
        className={`flex items-center px-2 py-2 rounded-lg transition-colors ${
          isEditMode ? "bg-red-500 hover:bg-red-600" : "bg-indigo-500 hover:bg-indigo-600"
        } text-white`}
      >
        {isEditMode ? <X size={16} className="mr-2" /> : <Edit3 size={16} className="mr-2" />}
        {isEditMode ? "Back" : "Edit"}
      </button>
    </div>
  );
}
