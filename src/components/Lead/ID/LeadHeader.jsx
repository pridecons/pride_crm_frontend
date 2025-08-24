import React from "react";
import StatusBadge from "./StatusBadge";

export default function LeadHeader({ currentLead }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-800">
        Lead Details {currentLead?.id ? `- ID #${currentLead.id}` : ""}
      </h3>
      <div className="sm:mt-0 flex items-center space-x-4">
        <StatusBadge status={currentLead?.is_call} type="call" />
        <StatusBadge status={currentLead?.kyc} type="kyc" />
        {currentLead?.is_client
          ? <StatusBadge status type="client" />
          : <StatusBadge status={currentLead?.is_old_lead} type="old" />}
      </div>
    </div>
  );
}