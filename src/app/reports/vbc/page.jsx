"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";

const ENDPOINT_ALL = "vbc-reports/call-logs";
const ENDPOINT_EMP = "vbc-reports/call-logs/employee";
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n ? String(n) : "0");

// HH:MM:SS (for title/tooltip)
const fmtHMS = (sec) => {
  const s = Math.max(0, Number(sec || 0) | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
};

// Human-readable duration: "1h 5m 7s", "5m 7s", or "7s"
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

// IST time with AM/PM
const formatIST = (s) => {
  if (!s) return "—";

  // const looksISO = s.includes("T") || /[+-]\d\d:?\d\d$/.test(s) || s.endsWith("Z");
  try {
    return s
    // if (looksISO) {
    //   const d = new Date(s);
    //   return new Intl.DateTimeFormat("en-IN", {
    //     timeZone: "Asia/Kolkata",
    //     day: "2-digit",
    //     month: "short",
    //     year: "numeric",
    //     hour: "numeric",
    //     minute: "2-digit",
    //     second: "2-digit",
    //     hour12: true,
    //   }).format(d);
    // }
    // const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    // if (m) {
    //   const y = m[1];
    //   const mo = parseInt(m[2], 10);
    //   const d = m[3];
    //   let hh = parseInt(m[4], 10);
    //   const mm = m[5];
    //   const ss = m[6];
    //   const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    //   const ampm = hh >= 12 ? "PM" : "AM";
    //   hh = hh % 12 || 12;
    //   const pad = (x) => String(x).padStart(2, "0");
    //   return `${d} ${months[mo - 1]} ${y}, ${pad(hh)}:${mm}:${ss} ${ampm}`;
    // }
    // const d = new Date(s);
    // if (!isNaN(d)) {
    //   return new Intl.DateTimeFormat("en-IN", {
    //     timeZone: "Asia/Kolkata",
    //     day: "2-digit",
    //     month: "short",
    //     year: "numeric",
    //     hour: "numeric",
    //     minute: "2-digit",
    //     second: "2-digit",
    //     hour12: true,
    //   }).format(d);
    // }
  } catch (_) {}
  return s;
};

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

  // ---------- All tab: fetch ----------
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

  // ---------- Employee tab: fetch ----------
  const fetchEmployee = async (opts) => {
    const params = {
      employee_code: empCode,
      order,
      ...(opts || {}),
    };
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All
        </TabButton>
        <TabButton active={tab === "employee"} onClick={() => setTab("employee")}>
          Employee
        </TabButton>
      </div>

      {tab === "all" && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">VBC Call Logs — Today</h1>
              <p className="text-sm text-gray-500">
                Date (IST): {data?.date_ist ?? "—"} · Scope: {data?.scope ?? data?.role_normalized ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="h-10 rounded-md border px-3 text-sm shadow-sm bg-white"
              >
                <option value="self">Self</option>
                <option value="team">Team</option>
              </select>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="h-10 rounded-md bg-black text-white px-4 text-sm disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
            <Metric title="Total" value={fmt(totalsAll.total)} />
            <Metric title="Inbound" value={fmt(totalsAll.inbound)} />
            <Metric title="Outbound" value={fmt(totalsAll.outbound)} />
            <Metric title="Answered" value={fmt(totalsAll.answered)} />
            <Metric title="Missed" value={fmt(totalsAll.missed)} />
            <Metric title="Attempted" value={fmt(totalsAll.attempted)} />
            <Metric title="Blocked" value={fmt(totalsAll.blocked)} />
            <Metric title="Voicemail" value={fmt(totalsAll.voicemail)} />
            <Metric title="Duration" value={fmtDur(totalsAll.duration_seconds)} />
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search employee / code / extension"
                className="w-full h-10 rounded-md border px-3 pr-9 text-sm shadow-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
            </div>
            {data?.employee_count != null && (
              <span className="text-sm text-gray-500">
                Showing {filteredEmployees.length} of {data.employee_count}
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Table (All) */}
          <div className="overflow-auto rounded-lg border relative max-h-[400px] overflow-y-auto">
            <table className="min-w/[1200px] w-full text-sm ">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr className="sticky top-0">
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
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-6 text-center text-gray-500">
                      No data
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredEmployees.map((e) => (
                    <tr key={`${e.employee_code}-${e.vbc_extension_id}`} className="border-t">
                      <Td>{e.name || "—"}</Td>
                      <Td className="font-mono">{e.employee_code}</Td>
                      <Td className="font-mono">{e.vbc_extension_id || "—"}</Td>
                      <TdRight>{fmt(e.stats?.total)}</TdRight>
                      <TdRight>{fmt(e.stats?.inbound)}</TdRight>
                      <TdRight>{fmt(e.stats?.outbound)}</TdRight>
                      <TdRight>{fmt(e.stats?.answered)}</TdRight>
                      <TdRight>{fmt(e.stats?.missed)}</TdRight>
                      <TdRight>{fmt(e.stats?.attempted)}</TdRight>
                      <TdRight>{fmt(e.stats?.blocked)}</TdRight>
                      <TdRight>{fmt(e.stats?.voicemail)}</TdRight>
                      <TdRight title={fmtHMS(e.stats?.duration_seconds)}>
                        {fmtDur(e.stats?.duration_seconds)}
                      </TdRight>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "employee" && (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Employee Call Logs — Today</h1>
              <p className="text-sm text-gray-500">Date (IST): {empData?.date_ist ?? "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                placeholder="Enter employee code"
                className="h-10 rounded-md border px-3 text-sm shadow-sm"
              />
              <button
                onClick={() => {
                  fetchEmployee();
                }}
                disabled={empLoading || !empCode}
                className="h-10 rounded-md bg-black text-white px-4 text-sm disabled:opacity-50"
              >
                {empLoading ? "Loading…" : "Load"}
              </button>
            </div>
          </div>

          {/* Summary (Employee) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
            <Metric title="Total" value={fmt(statsEmp.total)} />
            <Metric title="Inbound" value={fmt(statsEmp.inbound)} />
            <Metric title="Outbound" value={fmt(statsEmp.outbound)} />
            <Metric title="Answered" value={fmt(statsEmp.answered)} />
            <Metric title="Missed" value={fmt(statsEmp.missed)} />
            <Metric title="Attempted" value={fmt(statsEmp.attempted)} />
            <Metric title="Blocked" value={fmt(statsEmp.blocked)} />
            <Metric title="Voicemail" value={fmt(statsEmp.voicemail)} />
            <Metric title="Duration" value={fmtDur(statsEmp.duration_seconds)} />
          </div>

          {empError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{empError}</div>
          )}

          {/* User meta */}
          {empData?.user && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">User:</span> {empData.user.name || "—"} ·{" "}
              <span className="font-medium">Code:</span> {empData.user.employee_code} ·{" "}
              <span className="font-medium">Ext:</span> {empData.user.vbc_extension_id || "—"}
            </div>
          )}

          {/* Logs toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600 ml-3">Order:</label>
            <select
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
              }}
              className="h-9 rounded-md border px-2 text-sm bg-white"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>

          {/* Logs table */}
          <div className="overflow-auto rounded-lg border relative max-h-[420px] overflow-y-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr className="sticky top-0">
                  <Th>Start</Th>
                  <Th>Direction</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Result</Th>
                  <Th className="text-right">Length</Th>
                  <Th>Recorded</Th>
                </tr>
              </thead>
              <tbody>
                {empLoading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!empLoading && (!empData?.logs?.records || empData.logs.records.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No logs
                    </td>
                  </tr>
                )}
                {!empLoading &&
                  (empData?.logs?.records || []).map((r) => {
                    const sec = Number(r.length || 0) || 0;
                    return (
                      <tr key={r.id} className="border-t">
                        <Td className="font-mono">{formatIST(r.start)}</Td>
                        <Td>{r.direction || "—"}</Td>
                        <Td className="font-mono">{r.from || "—"}</Td>
                        <Td className="font-mono">{r.to || "—"}</Td>
                        <Td>{r.result || "—"}</Td>
                        <TdRight title={fmtHMS(sec)}>{fmtDur(sec)}</TdRight>
                        <Td>{String(r.recorded ?? "").toLowerCase() === "true" ? "Yes" : "No"}</Td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-2 text-sm border-b-2 -mb-px " +
        (active ? "border-black font-medium" : "border-transparent text-gray-600 hover:text-black")
      }
    >
      {children}
    </button>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wide ${className}`}>{children}</th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function TdRight({ children, className = "" }) {
  return <td className={`px-3 py-2 text-right tabular-nums ${className}`}>{children}</td>;
}
