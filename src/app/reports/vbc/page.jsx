// src/app/reports/vbc-call-logs/page.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";

/* ---------------------------------- Consts --------------------------------- */
const ENDPOINT_ALL = "vbc-reports/call-logs";
const ENDPOINT_EMP = "vbc-reports/call-logs/employee";
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n ? String(n) : "0");

/* ------------------------------- Helper fns -------------------------------- */
// HH:MM:SS (for title/tooltip)
const fmtHMS = (sec) => {
  const s = Math.max(0, Number(sec || 0) | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
};

// Human-readable: 1h 5m 7s / 5m 7s / 7s
const fmtDur = (sec) => {
  const s = Math.max(0, Number(sec || 0) | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${r}s`);
  return parts.join(" ");
};

// IST time with AM/PM (safe)
const formatIST = (val) => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (!isNaN(d)) {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d);
    }
  } catch (_) {}
  return String(val);
};

/* -------------------------------- Component -------------------------------- */
export default function VbcCallLogsDashboard() {
  const [tab, setTab] = useState("all"); // "all" | "employee"

  // ===== All tab state =====
  const [view, setView] = useState("self"); // "self" | "team"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");

  // ===== Employee tab state =====
  const [empCode, setEmpCode] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState(null);
  const [empData, setEmpData] = useState(null);
  const [order, setOrder] = useState("desc"); // "asc" | "desc"

  /* ---------------------------- Data: All (Team/Self) ---------------------------- */
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(ENDPOINT_ALL, { params: { view } });
      setData(res.data);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "all") fetchAll();
  }, [tab, view]);

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.employees;
    return data.employees.filter((e) => {
      const name = (e.name || "").toLowerCase();
      const code = (e.employee_code || "").toLowerCase();
      const ext = (e.vbc_extension_id || "").toLowerCase();
      return name.includes(needle) || code.includes(needle) || ext.includes(needle);
    });
  }, [data, q]);

  const totalsAll = data?.totals || {
    total: 0,
    inbound: 0,
    outbound: 0,
    answered: 0,
    missed: 0,
    attempted: 0,
    blocked: 0,
    voicemail: 0,
    duration_seconds: 0,
  };

  /* ------------------------------- Data: Employee ------------------------------ */
  const fetchEmployee = async (opts) => {
    const params = { employee_code: empCode, order, ...(opts || {}) };
    if (!params.employee_code) {
      setEmpError("Enter an employee code first.");
      return;
    }
    setEmpLoading(true);
    setEmpError(null);
    try {
      const res = await axiosInstance.get(ENDPOINT_EMP, { params });
      setEmpData(res.data);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load";
      setEmpError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "employee" && empCode) {
      fetchEmployee();
    }
  }, [tab, order]);

  const statsEmp = empData?.stats || {
    total: 0,
    inbound: 0,
    outbound: 0,
    answered: 0,
    missed: 0,
    attempted: 0,
    blocked: 0,
    voicemail: 0,
    duration_seconds: 0,
  };

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6 md:p-8 space-y-6 mx-2">
        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-1 inline-flex">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            All Employees
          </TabButton>
          <TabButton active={tab === "employee"} onClick={() => setTab("employee")}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Individual
          </TabButton>
        </div>

        {/* ============================== ALL TAB ============================== */}
        {tab === "all" && (
          <>
            {/* Header */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    VBC Call Logs — Today
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {data?.date_ist ?? "—"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {data?.scope ?? data?.role_normalized ?? "—"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={view}
                    onChange={(e) => setView(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 px-4 text-sm shadow-sm bg-white/90 backdrop-blur hover:border-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="self">Self View</option>
                    <option value="team">Team View</option>
                  </select>
                  <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 text-sm font-medium disabled:opacity-50 hover:shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Refreshing
                      </span>
                    ) : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              <Metric title="Total" value={fmt(totalsAll.total)} color="blue" />
              <Metric title="Inbound" value={fmt(totalsAll.inbound)} color="green"  />
              <Metric title="Outbound" value={fmt(totalsAll.outbound)} />
              <Metric title="Answered" value={fmt(totalsAll.answered)} color="emerald"/>
              <Metric title="Missed" value={fmt(totalsAll.missed)} color="red"  />
              <Metric title="Attempted" value={fmt(totalsAll.attempted)} color="orange"  />
              <Metric title="Blocked" value={fmt(totalsAll.blocked)} color="gray"  />
              <Metric title="Voicemail" value={fmt(totalsAll.voicemail)} color="indigo" />
              <Metric title="Duration" value={fmtDur(totalsAll.duration_seconds)} color="cyan" />
            </div>

            {/* Search */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search employee / code / extension"
                    className="w-full h-11 rounded-xl border-slate-200 pl-10 pr-4 text-sm shadow-sm hover:border-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {data?.employee_count != null && (
                  <span className="text-sm text-slate-600 font-medium">
                    Showing {filteredEmployees.length} of {data.employee_count} employees
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50/90 backdrop-blur p-4 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Table (All) */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-auto max-h-[500px]">
                <table className="min-w-[1200px] w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-blue-50 sticky top-0 z-10">
                    <tr>
                      <Th>Employee</Th>
                      <Th>Code</Th>
                      <Th>Extension</Th>
                      <Th className="text-right">Total</Th>
                      <Th className="text-right">Inbound</Th>
                      <Th className="text-right">Outbound</Th>
                      <Th className="text-right">Answered</Th>
                      <Th className="text-right">Missed</Th>
                      <Th className="text-right">Attempted</Th>
                      <Th className="text-right">Blocked</Th>
                      <Th className="text-right">Voicemail</Th>
                      <Th className="text-right">Duration</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading && (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-500">
                          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Loading data...
                        </td>
                      </tr>
                    )}
                    {!loading && filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-500">
                          No data available
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      filteredEmployees.map((e) => (
                        <tr
                          key={`${e.employee_code}-${e.vbc_extension_id}`}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <Td className="font-medium text-slate-900">{e.name || "—"}</Td>
                          <Td className="font-mono text-slate-600">{e.employee_code}</Td>
                          <Td className="font-mono text-slate-600">{e.vbc_extension_id || "—"}</Td>
                          <TdRight className="font-semibold text-blue-600">{fmt(e.stats?.total)}</TdRight>
                          <TdRight className="text-green-600">{fmt(e.stats?.inbound)}</TdRight>
                          <TdRight className="text-purple-600">{fmt(e.stats?.outbound)}</TdRight>
                          <TdRight className="text-emerald-600">{fmt(e.stats?.answered)}</TdRight>
                          <TdRight className="text-red-600">{fmt(e.stats?.missed)}</TdRight>
                          <TdRight className="text-orange-600">{fmt(e.stats?.attempted)}</TdRight>
                          <TdRight className="text-gray-600">{fmt(e.stats?.blocked)}</TdRight>
                          <TdRight className="text-indigo-600">{fmt(e.stats?.voicemail)}</TdRight>
                          <TdRight title={fmtHMS(e.stats?.duration_seconds)} className="text-cyan-600 font-medium">
                            {fmtDur(e.stats?.duration_seconds)}
                          </TdRight>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ============================ EMPLOYEE TAB ============================ */}
        {tab === "employee" && (
          <>
            {/* Header */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Employee Call Logs — Today
                  </h1>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date (IST): {empData?.date_ist ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="Enter employee code"
                    className="h-11 rounded-xl border-slate-200 px-4 text-sm shadow-sm hover:border-blue-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => fetchEmployee()}
                    disabled={empLoading || !empCode}
                    className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 text-sm font-medium disabled:opacity-50 hover:shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    {empLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Loading
                      </span>
                    ) : "Load"}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary (Employee) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              <Metric title="Total" value={fmt(statsEmp.total)} color="blue" icon="📞" />
              <Metric title="Inbound" value={fmt(statsEmp.inbound)} color="green" icon="📥" />
              <Metric title="Outbound" value={fmt(statsEmp.outbound)} color="purple" icon="📤" />
              <Metric title="Answered" value={fmt(statsEmp.answered)} color="emerald" icon="✅" />
              <Metric title="Missed" value={fmt(statsEmp.missed)} color="red" icon="❌" />
              <Metric title="Attempted" value={fmt(statsEmp.attempted)} color="orange" icon="🔄" />
              <Metric title="Blocked" value={fmt(statsEmp.blocked)} color="gray" icon="🚫" />
              <Metric title="Voicemail" value={fmt(statsEmp.voicemail)} color="indigo" icon="📨" />
              <Metric title="Duration" value={fmtDur(statsEmp.duration_seconds)} color="cyan" icon="⏱️" />
            </div>

            {empError && (
              <div className="rounded-xl border border-red-200 bg-red-50/90 backdrop-blur p-4 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {empError}
              </div>
            )}

            {/* User meta */}
            {empData?.user && (
              <div className="bg-white/90 backdrop-blur rounded-xl shadow-md p-4 flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                    {empData.user.name?.charAt(0) || "?"}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-900">{empData.user.name || "—"}</div>
                    <div className="text-slate-600">
                      Code: {empData.user.employee_code} • Ext: {empData.user.vbc_extension_id || "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs toolbar */}
            <div className="bg-white/90 backdrop-blur rounded-xl shadow-md p-3 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Sort Order:</label>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="h-9 rounded-lg border-slate-200 px-3 text-sm bg-white hover:border-blue-300 transition-colors"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>

            {/* Logs table */}
            <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-auto max-h-[500px]">
                <table className="min-w-[1100px] w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-blue-50 sticky top-0 z-10">
                    <tr>
                      <Th>Start Time</Th>
                      <Th>Direction</Th>
                      <Th>From</Th>
                      <Th>To</Th>
                      <Th>Result</Th>
                      <Th className="text-right">Duration</Th>
                      <Th>Recorded</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empLoading && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Loading logs...
                        </td>
                      </tr>
                    )}
                    {!empLoading && (!empData?.logs?.records || empData.logs.records.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No logs available
                        </td>
                      </tr>
                    )}
                    {!empLoading &&
                      (empData?.logs?.records || []).map((r) => {
                        const sec = Number(r.length || 0) || 0;
                        return (
                          <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                            <Td className="font-mono text-slate-700">{formatIST(r.start)}</Td>
                            <Td>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${r.direction === "Inbound" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"}`}
                              >
                                {r.direction || "—"}
                              </span>
                            </Td>
                            <Td className="font-mono text-slate-600">{r.from || "—"}</Td>
                            <Td className="font-mono text-slate-600">{r.to || "—"}</Td>
                            <Td>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${
                                  r.result === "Answered"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.result === "Missed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {r.result || "—"}
                              </span>
                            </Td>
                            <TdRight title={fmtHMS(sec)} className="font-medium text-cyan-600">
                              {fmtDur(sec)}
                            </TdRight>
                            <Td>
                              {String(r.recorded ?? "").toLowerCase() === "true" ? (
                                <span className="text-green-600">✓ Yes</span>
                              ) : (
                                <span className="text-gray-400">— No</span>
                              )}
                            </Td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Partials -------------------------------- */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center
        ${active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"}`}
    >
      {children}
    </button>
  );
}

function Metric({ title, value, color = "blue", icon }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    orange: "from-orange-500 to-orange-600",
    gray: "from-gray-500 to-gray-600",
    indigo: "from-indigo-500 to-indigo-600",
    cyan: "from-cyan-500 to-cyan-600",
  };

  return (
    <div className="group relative bg-white/90 backdrop-blur rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-105">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">{title}</div>
          <span className="text-lg">{icon}</span>
        </div>
        <div className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
function TdRight({ children, className = "", title }) {
  return (
    <td className={`px-4 py-3 text-right tabular-nums text-sm ${className}`} title={title}>
      {children}
    </td>
  );
}
