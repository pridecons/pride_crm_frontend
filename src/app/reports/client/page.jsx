// src/app/reports/clients/page.jsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Download, Filter } from "lucide-react";

/* ---------------------------------- Shared --------------------------------- */

// Column labels (match backend COLUMN_MAP keys)
const COLUMN_OPTIONS = [
  ["client_name", "Client Name"],
  ["pan", "PAN"],
  ["registration_date", "Registration Date"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["fees_collected", "Fees Collected"],
  ["payments_count", "Payments Count"],
  ["first_payment_date", "First Payment"],
  ["last_payment_date", "Last Payment"],
  ["product", "Product/Service"],
  ["service_start", "Service Start"],
  ["service_end", "Service End"],
  ["renewal_date", "Renewal Date"],
  ["lead_source", "Lead Source"],
  ["lead_response", "Lead Response"],
  ["employee_code", "Employee Code"],
  ["employee_name", "Employee Name"],
  ["branch_name", "Branch"],
];

// backend defaults
const DEFAULT_COLS = [
  "client_name",
  "pan",
  "registration_date",
  "email",
  "mobile",
  "fees_collected",
  "payments_count",
  "first_payment_date",
  "last_payment_date",
  "product",
  "service_start",
  "service_end",
  "renewal_date",
  "lead_source",
  "lead_response",
  "employee_code",
  "employee_name",
  "branch_name",
];

const moneyINR = (n) => {
  const num = Number(n || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString("en-IN")}`;
  }
};
const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"));
const fmtDate = (s) => (s ? String(s).replace("T", " ").replace("Z", "") : "—");

/* --------------------------------- Page ------------------------------------ */

export default function ClientsReportPage() {
  const [tab, setTab] = useState("all"); // "all" | "lead"

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="p-6 md:p-8 space-y-6 mx-2">
        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-1 inline-flex">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            All Clients
          </TabButton>
          <TabButton active={tab === "lead"} onClick={() => setTab("lead")}>
            Lead Details
          </TabButton>
        </div>

        {tab === "all" ? <AllClientsTab /> : <LeadDetailsTab />}
      </div>
    </div>
  );
}

/* ------------------------------ All Tab (logic from old, UI from new) ------ */

function AllClientsTab() {
  // ---- filters/state ----
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD
  const [days, setDays] = useState(30);
  const [filterBy, setFilterBy] = useState("payment_date"); // "payment_date" | "registration_date"

  const [branchId, setBranchId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [responseId, setResponseId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("all"); // "self" | "team" | "all"

  const [columns, setColumns] = useState(DEFAULT_COLS.slice());
  const [openCols, setOpenCols] = useState(false);

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(50);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [windowInfo, setWindowInfo] = useState(null);

  const page = Math.floor(skip / limit) + 1;
  const maxPage = Math.max(1, Math.ceil(total / limit));

  const toggleColumn = (key) => {
    setColumns((prev) => {
      if (prev.includes(key)) return prev.filter((c) => c !== key);
      return [...prev, key];
    });
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setDays(30);
    setFilterBy("payment_date");
    setBranchId("");
    setSourceId("");
    setResponseId("");
    setEmployeeId("");
    setProfileId("");
    setDepartmentId("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setView("all");
    setColumns(DEFAULT_COLS.slice());
    setSkip(0);
    setLimit(50);
  };

  const buildParams = () => {
    const p = {
      filter_by: filterBy,
      view,
      skip,
      limit,
    };
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    if (!fromDate && !toDate) p.days = days;

    if (branchId) p.branch_id = Number(branchId);
    if (sourceId) p.source_id = Number(sourceId);
    if (responseId) p.response_id = Number(responseId);
    if (employeeId) p.employee_id = employeeId;
    if (profileId) p.profile_id = Number(profileId);
    if (departmentId) p.department_id = Number(departmentId);
    if (minAmount !== "") p.min_amount = Number(minAmount);
    if (maxAmount !== "") p.max_amount = Number(maxAmount);
    if (search) p.search = search;

    // columns (repeat param)
    p.columns = columns;

    return p;
  };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/reports/clients", {
        params: buildParams(),
      });
      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
      setWindowInfo(res.data?.window || null);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // fetch on mount + when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fromDate,
    toDate,
    days,
    filterBy,
    branchId,
    sourceId,
    responseId,
    employeeId,
    profileId,
    departmentId,
    minAmount,
    maxAmount,
    search,
    view,
    columns,
    skip,
    limit,
  ]);

  const exportFile = async (fmt) => {
    try {
      const params = buildParams();
      const res = await axiosInstance.get("/reports/clients/export", {
        params: { ...params, fmt },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type:
          fmt === "csv"
            ? "text/csv;charset=utf-8;"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `client_report_${stamp}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Export failed";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const visibleColumns = useMemo(() => {
    // keep the selection order as-is
    return columns.filter((k) => COLUMN_OPTIONS.some(([key]) => key === k));
  }, [columns]);

  return (
    <>
      {/* Header */}
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
              Client Report
            </h1>
            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Window:{" "}
              {windowInfo
                ? `${windowInfo.from?.replace("T", " ")} → ${windowInfo.to?.replace("T", " ")} · by ${windowInfo.dimension}`
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportFile("csv")}
              className="h-11 rounded-xl border-2 border-purple-200 bg-white px-5 text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Download size={16} strokeWidth={1.5} />
                Export CSV
              </span>
            </button>
            <button
              onClick={() => exportFile("xlsx")}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 text-sm font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <Download size={16} strokeWidth={1.5} />
                Export XLSX
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={18} strokeWidth={1.5}/>
          <span className="font-semibold text-slate-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Filter By</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="payment_date">Payment Date</option>
              <option value="registration_date">Registration Date</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setSkip(0);
              }}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setSkip(0);
              }}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Days (when no dates)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => {
                const v = Number(e.target.value || 30);
                setDays(v);
                setSkip(0);
              }}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Branch ID</label>
            <input
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Source ID</label>
            <input
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Response ID</label>
            <input
              value={responseId}
              onChange={(e) => setResponseId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Employee Code</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Profile ID</label>
            <input
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Department ID</label>
            <input
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Min Amount</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Max Amount</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Search</label>
            <div className="relative border border-slate-300 rounded-xl">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSkip(0);
                }}
                placeholder="name / email / mobile / PAN / city / state / product"
                className="w-full h-11 rounded-xl border-slate-200 pl-10 pr-4 text-sm hover:border-purple-300 transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">View</label>
            <select
              value={view}
              onChange={(e) => {
                setView(e.target.value);
                setSkip(0);
              }}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="team">Team</option>
              <option value="self">Self</option>
            </select>
          </div>

          {/* Column picker */}
          <div className="relative">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Columns</label>
            <button
              type="button"
              onClick={() => setOpenCols((o) => !o)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm
           hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {columns.length} selected
            </button>
            {openCols && (
              <div className="absolute z-20 mt-2 w-[24rem] max-h-80 overflow-auto rounded-xl border bg-white p-4 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium text-slate-700">Pick columns</div>
                  <div className="space-x-3">
                    <button
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      onClick={() => setColumns(COLUMN_OPTIONS.map(([k]) => k))}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      onClick={() => setColumns([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_OPTIONS.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-purple-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={columns.includes(key)}
                        onChange={() => toggleColumn(key)}
                        className="text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              setSkip(0);
              fetchData();
            }}
            className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 text-sm font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="h-11 rounded-xl border-2 border-purple-200 bg-white px-6 text-sm font-medium hover:bg-purple-50 transition-colors"
          >
            Reset All
          </button>
          {loading && (
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </span>
          )}
          {err && (
            <span className="flex items-center gap-2 text-sm text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {err}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-slate-600">Total Records:</span>
            <span className="font-bold text-purple-600 text-lg">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="min-w-[1400px] w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-pink-50 sticky top-0 z-10">
              <tr>
                {visibleColumns.map((key) => {
                  const label = COLUMN_OPTIONS.find(([k]) => k === key)?.[1] || key;
                  return <Th key={key}>{label}</Th>;
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-8 text-center">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-purple-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-slate-500">Loading data...</span>
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-8 text-center text-slate-500">
                    No data available
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-purple-50/50 transition-colors">
                    {visibleColumns.map((key) => {
                      let val = row[key];

                      // pretty prints (match old logic)
                      if (key === "fees_collected" && val != null) {
                        val = <span className="font-semibold text-green-600">{moneyINR(val)}</span>;
                      }
                      if (key === "payments_count" && val != null) {
                        val = <span className="font-medium text-blue-600">{Number(val).toLocaleString()}</span>;
                      }
                      if (key === "lead_response") {
                        val = (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              val === "Converted" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {val || "—"}
                          </span>
                        );
                      }

                      return <Td key={key}>{val == null || val === "" ? "—" : val}</Td>;
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white/90 backdrop-blur rounded-xl shadow-md p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Page</span>
          <span className="font-bold text-purple-600 text-lg">{page}</span>
          <span className="text-sm text-slate-600">of {maxPage}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-10 px-4 rounded-xl border-2 border-purple-200 text-sm font-medium disabled:opacity-50 hover:bg-purple-50 transition-colors flex items-center gap-1"
            onClick={() => setSkip((s) => Math.max(0, s - limit))}
            disabled={loading || skip <= 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <button
            className="h-10 px-4 rounded-xl border-2 border-purple-200 text-sm font-medium disabled:opacity-50 hover:bg-purple-50 transition-colors flex items-center gap-1"
            onClick={() => {
              const next = skip + limit;
              if (next < total) setSkip(next);
            }}
            disabled={loading || skip + limit >= total}
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Rows per page</label>
          <select
            value={limit}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLimit(v);
              setSkip(0);
            }}
            className="h-10 rounded-xl border-slate-200 px-3 text-sm bg-white hover:border-purple-300 transition-colors"
          >
            {[25, 50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Lead Tab (logic from old, UI from new) ----- */

function LeadDetailsTab() {
  const [leadId, setLeadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);

  const fetchLead = async () => {
    if (!leadId) {
      setErr("Enter a Lead ID");
      return;
    }
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const res = await axiosInstance.get(`/reports/clients/${encodeURIComponent(leadId)}`);
      setData(res.data);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load";
      setErr(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const client = data?.client || {};
  const payments = data?.payments || [];
  const summary = data?.payments_summary || {};
  const assignments = data?.assignments || [];

  return (
    <>
      {/* Header */}
      <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Client Details (Lead)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Fetch by Lead ID to see full profile, assignments and all payments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <input
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                placeholder="Enter Lead ID"
                className="h-11 rounded-xl border-slate-200 pl-10 pr-4 text-sm shadow-sm hover:border-purple-300 transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchLead}
              disabled={loading || !leadId}
              className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 text-sm font-medium disabled:opacity-50 hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading
                </span>
              ) : (
                "Load Details"
              )}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 backdrop-blur p-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700">{err}</span>
        </div>
      )}

      {/* Client info */}
      {data && (
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              {client.client_name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{client.client_name || "—"}</h2>
              <p className="text-sm text-slate-600">Lead ID: {client.lead_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Meta label="PAN" value={client.pan} mono icon="🆔" />
            <Meta label="Registered" value={fmtDate(client.registration_date)} icon="📅" />
            <Meta label="Email" value={client.email} icon="✉️" />
            <Meta label="Mobile" value={client.mobile} mono icon="📱" />
            <Meta label="Product/Service" value={client.product} icon="📦" />
            <Meta label="Branch" value={client.branch_name} icon="🏢" />
            <Meta label="Primary Emp Code" value={client.employee_primary_code} mono icon="👤" />
            <Meta label="Primary Emp Name" value={client.employee_primary_name} icon="👤" />
            <Meta label="Service Start" value={fmtDate(client.service_start)} icon="▶️" />
            <Meta label="Service End" value={fmtDate(client.service_end)} icon="⏹️" />
            <Meta label="Lead Source" value={client.lead_source} icon="🎯" />
            <Meta label="Lead Response" value={client.lead_response} icon="💬" />
          </div>

          {(client.address || client.city || client.state || client.pincode) && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <Meta label="Address" value={client.address} className="sm:col-span-2" icon="📍" />
              <Meta label="City" value={client.city} icon="🌆" />
              <Meta label="State" value={client.state} icon="🗺️" />
              <Meta label="Pincode" value={client.pincode} icon="📮" />
            </div>
          )}
        </div>
      )}

      {/* Assignments + Summary */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Assignments
            </h3>
            {assignments.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">No assignments</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-[400px] w-full">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <Th>Employee Code</Th>
                      <Th>Employee Name</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a, i) => (
                      <tr key={i} className="hover:bg-purple-50/50 transition-colors">
                        <Td className="font-mono text-purple-600">{a.employee_code || "—"}</Td>
                        <Td className="font-medium">{a.employee_name || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Payments Summary
            </h3>
            <div className="space-y-3">
              <SummaryRow label="Total Paid" value={moneyINR(summary.total_paid || 0)} />
              <SummaryRow label="Paid Count" value={fmtNum(summary.count_paid || 0)} />
              <SummaryRow label="First Payment" value={fmtDate(summary.first_payment_date)} />
              <SummaryRow label="Last Payment" value={fmtDate(summary.last_payment_date)} />
            </div>
          </div>
        </div>
      )}

      {/* Payments table */}
      {data && (
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            All Payments
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-auto max-h-[400px]">
              <table className="min-w-[1000px] w-full">
                <thead className="bg-gradient-to-r from-purple-50 to-pink-50 sticky top-0">
                  <tr>
                    <Th>ID</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                    <Th>Mode</Th>
                    <Th>Reference</Th>
                    <Th>Created</Th>
                    <Th>Updated</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No payments recorded
                      </td>
                    </tr>
                  )}
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-purple-50/50 transition-colors">
                      <Td className="font-mono text-purple-600">{p.id ?? "—"}</Td>
                      <Td>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "Paid" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {p.status || "—"}
                        </span>
                      </Td>
                      <Td className="font-semibold text-green-600">
                        {p.paid_amount != null ? moneyINR(p.paid_amount) : "—"}
                      </Td>
                      <Td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                          {p.payment_mode || "—"}
                        </span>
                      </Td>
                      <Td className="font-mono text-slate-600">{p.reference_no || "—"}</Td>
                      <Td className="text-slate-600">{fmtDate(p.created_at)}</Td>
                      <Td className="text-slate-600">{fmtDate(p.updated_at)}</Td>
                      <Td className="text-slate-600">{p.notes || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* --------------------------- Small UI helpers ------------------------------ */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center
        ${active ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105" : "text-slate-600 hover:text-slate-900 hover:bg-white/50"}`}
    >
      {children}
    </button>
  );
}
function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}
function Meta({ label, value, mono, className = "", icon }) {
  return (
    <div className={`group bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <div className="text-xs font-medium text-slate-600">{label}</div>
      </div>
      <div className={"text-sm font-semibold text-slate-900 " + (mono ? "font-mono" : "")}>{value || "—"}</div>
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/80 text-sm">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}
