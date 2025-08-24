import React from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function StatusBadge({ status, type = "default" }) {
  const color = (() => {
    switch (type) {
      case "call": return status ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
      case "kyc":  return status ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
      case "old":  return status ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800";
      case "client": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  })();

  const text = (() => {
    switch (type) {
      case "call": return status ? "Called" : "Not Called";
      case "kyc":  return status ? "KYC Completed" : "KYC Pending";
      case "old":  return status ? "Old Lead" : "New Lead";
      case "client": return "Client";
      default: return status ? "Active" : "Inactive";
    }
  })();

  const icon = (() => {
    switch (type) {
      case "call": return status ? <CheckCircle size={12} /> : <AlertCircle size={12} />;
      case "kyc":  return status ? <CheckCircle size={12} /> : <XCircle size={12} />;
      default: return null;
    }
  })();

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon}
      <span className="ml-1">{text}</span>
    </span>
  );
}