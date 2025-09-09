"use client";

import React, { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import LoadingState from "@/components/LoadingState";
import EmployeeWithDataAccuracy from "@/components/analytics/EmployeeWithDataAccuracy";
import DashboardTables from "@/components/analytics/DashboardTable";
import ResponseDistribution from "@/components/analytics/ResponseTable";

/* ====================== PAGE ====================== */
export default function LeadAnalyticsPage() {
    const [role, setRole] = useState(null);
    const [branchId, setBranchId] = useState(null);
    const isSuperAdmin = role === "SUPERADMIN";

    useEffect(() => {
        try {
            // Prefer user_info cookie
            const ui = Cookies.get("user_info");
            if (ui) {
                const parsed = JSON.parse(ui);
                const r = parsed?.role || parsed?.user?.role || null;
                const b =
                    parsed?.branch_id ??
                    parsed?.user?.branch_id ??
                    parsed?.branch?.id ??
                    null;
                setRole(r);
                setBranchId(b ? String(b) : null);
                return;
            }
            // Fallback: access_token
            const token = Cookies.get("access_token");
            if (token) {
                const payload = jwtDecode(token);
                const r = payload?.role || null;
                const b = payload?.branch_id ?? payload?.user?.branch_id ?? null;
                setRole(r);
                setBranchId(b ? String(b) : null);
            }
        } catch (e) {
            console.error("Failed to read user info from cookies", e);
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Lead Analytics</h1>
                <p className="text-gray-600 mt-1">
                    Lead Source balance, Response Distribution & Employee Data Accuracy
                </p>
            </div>

            <DashboardTables isSuperAdmin={isSuperAdmin} branchId={branchId} />
            <ResponseDistribution/>
            <EmployeeWithDataAccuracy />
        </div>
    );
}