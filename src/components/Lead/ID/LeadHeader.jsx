"use client";

import React from "react";
import { UserCheck, Building } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function LeadHeader({ currentLead, isSuperAdmin = false }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
      {/* <h3 className="text-2xl font-bold text-gray-800"> Lead Details {currentLead?.id ? - ID #${currentLead.id} : ""} </h3> */}
      {/* Assigned  */}
      {currentLead && (
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            {/* Assigned To */}
            <div
              className="group inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow-sm"
              style={{
                border: `1px solid var(--theme-border)`,
                background: "var(--theme-card-bg)",
                color: "var(--theme-text)",
              }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: "color-mix(in srgb, var(--theme-primary) 12%, transparent)" }}
              >
                <UserCheck size={14} style={{ color: "var(--theme-primary)" }} />
              </span>
              <span className="font-medium" style={{ color: "var(--theme-text)" }}>
                Assigned
              </span>
              <span style={{ color: "var(--theme-muted)" }}>•</span>

              {(() => {
                const assignedName = currentLead?.assigned_user?.name || null;
                const assignedCode =
                  currentLead?.assigned_user?.employee_code || currentLead?.assigned_to_user || null;

                if (!assignedName && !assignedCode) {
                  return <span style={{ color: "var(--theme-muted)" }}>—</span>;
                }

                return (
                  <span
                    className="truncate max-w-[160px] sm:max-w-[220px]"
                    title={assignedName || assignedCode || "—"}
                  >
                    <span style={{ color: "var(--theme-text)" }}>
                      {assignedName || assignedCode}
                    </span>
                    {assignedCode ? (
                      <span style={{ color: "var(--theme-muted)" }}> ({assignedCode})</span>
                    ) : null}
                  </span>
                );
              })()}
            </div>

            {/* only for SUPERADMIN */}
            {isSuperAdmin && (
              <div
                className="group inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs shadow-sm"
                style={{
                  border: `1px solid var(--theme-border)`,
                  background: "var(--theme-card-bg)",
                  color: "var(--theme-text)",
                }}
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "color-mix(in srgb, var(--theme-success) 12%, transparent)" }}
                >
                  <Building size={14} style={{ color: "var(--theme-success)" }} />
                </span>
              </div>
            )}
          </div>
      )}

      {/* Right-side status pills */}
      <div className="sm:mt-0 flex items-center space-x-4">
        <StatusBadge status={currentLead?.is_call} type="call" />
        <StatusBadge status={currentLead?.kyc} type="kyc" />
        {currentLead?.is_client ? (
          <StatusBadge status type="client" />
        ) : (
          <StatusBadge status={currentLead?.is_old_lead} type="old" />
        )}
      </div>
    </div>
  );
}
