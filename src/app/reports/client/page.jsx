"use client";
import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";

/* ---------------------------------- Shared --------------------------------- */

// ---- Column labels (match backend COLUMN_MAP keys) ----
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>All</TabButton>
        <TabButton active={tab === "lead"} onClick={() => setTab("lead")}>Lead</TabButton>
      </div>

      {tab === "all" ? <AllClientsTab /> : <LeadDetailsTab />}
    </div>
  );
}

/* ------------------------------ All Tab (existing) ------------------------- */

function AllClientsTab() {
  // ---- filters/state ----
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState("");     // YYYY-MM-DD
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
  }, [fromDate, toDate, days, filterBy, branchId, sourceId, responseId, employeeId, profileId, departmentId, minAmount, maxAmount, search, view, columns, skip, limit]);

  const exportFile = async (fmt) => {
    try {
      const params = buildParams();
      const res = await axiosInstance.get("/reports/clients/export", {
        params: { ...params, fmt },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: fmt === "csv"
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
      {/* Title + window info */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client Report</h1>
          <p className="text-sm text-gray-500">
            Window:{" "}
            {windowInfo
              ? `${windowInfo.from?.replace("T", " ")} → ${windowInfo.to?.replace("T", " ")} · by ${windowInfo.dimension}`
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFile("csv")}
            className="h-10 rounded-md border px-4 text-sm bg-white"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportFile("xlsx")}
            className="h-10 rounded-md bg-black text-white px-4 text-sm"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Filter By</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
            >
              <option value="payment_date">Payment Date</option>
              <option value="registration_date">Registration Date</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setSkip(0);
              }}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setSkip(0);
              }}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Days (when no dates)</label>
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
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-gray-500">Branch ID</label>
            <input value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Source ID</label>
            <input value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Response ID</label>
            <input value={responseId} onChange={(e) => setResponseId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Employee Code</label>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Profile ID</label>
            <input value={profileId} onChange={(e) => setProfileId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Department ID</label>
            <input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-gray-500">Min Amount</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Max Amount</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-500">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSkip(0);
              }}
              placeholder="name / email / mobile / PAN / city / state / product"
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">View</label>
            <select
              value={view}
              onChange={(e) => {
                setView(e.target.value);
                setSkip(0);
              }}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm bg-white"
            >
              <option value="all">All</option>
              <option value="team">Team</option>
              <option value="self">Self</option>
            </select>
          </div>

          {/* Column picker */}
          <div className="relative">
            <label className="text-xs text-gray-500">Columns</label>
            <button
              type="button"
              onClick={() => setOpenCols((o) => !o)}
              className="mt-1 w-full h-10 rounded-md border px-3 text-sm text-left bg-white"
            >
              {columns.length} selected
            </button>
            {openCols && (
              <div className="absolute z-20 mt-1 w-[22rem] max-h-72 overflow-auto rounded-lg border bg-white p-3 shadow-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">Pick columns</div>
                  <div className="space-x-2">
                    <button
                      className="text-xs underline"
                      onClick={() => setColumns(COLUMN_OPTIONS.map(([k]) => k))}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs underline"
                      onClick={() => setColumns([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_OPTIONS.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={columns.includes(key)}
                        onChange={() => toggleColumn(key)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSkip(0);
              fetchData();
            }}
            className="h-10 rounded-md bg-black text-white px-4 text-sm"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="h-10 rounded-md border px-4 text-sm bg-white"
          >
            Reset
          </button>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
          <div className="ml-auto text-sm text-gray-600">
            Total: <span className="font-medium">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border relative">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 sticky top-0">
            <tr>
              {visibleColumns.map((key) => {
                const label = COLUMN_OPTIONS.find(([k]) => k === key)?.[1] || key;
                return (
                  <Th key={key}>{label}</Th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={visibleColumns.length} className="p-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="p-6 text-center text-gray-500">
                  No data
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, idx) => (
                <tr key={idx} className="border-t">
                  {visibleColumns.map((key) => {
                    let val = row[key];

                    // pretty prints
                    if (key === "fees_collected" && val != null) {
                      val = moneyINR(val);
                    }
                    if (key === "payments_count" && val != null) {
                      val = Number(val).toLocaleString();
                    }

                    return <Td key={key}>{val == null || val === "" ? "—" : String(val)}</Td>;
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-3">
        <div className="text-sm">
          Page <span className="font-medium">{page}</span> of{" "}
          <span className="font-medium">{maxPage}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 px-3 rounded-md border text-sm"
            onClick={() => setSkip((s) => Math.max(0, s - limit))}
            disabled={loading || skip <= 0}
          >
            ← Prev
          </button>
          <button
            className="h-9 px-3 rounded-md border text-sm"
            onClick={() => {
              const next = skip + limit;
              if (next < total) setSkip(next);
            }}
            disabled={loading || skip + limit >= total}
          >
            Next →
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Rows per page</label>
          <select
            value={limit}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLimit(v);
              setSkip(0);
            }}
            className="h-9 rounded-md border px-2 text-sm bg-white"
          >
            {[25, 50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Lead Tab (new) ----------------------------- */

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
      {/* Header / search */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client Details (Lead)</h1>
          <p className="text-sm text-gray-500">Fetch by Lead ID to see full profile, assignments and all payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            placeholder="Enter Lead ID"
            className="h-10 rounded-md border px-3 text-sm shadow-sm"
          />
          <button
            onClick={fetchLead}
            disabled={loading || !leadId}
            className="h-10 rounded-md bg-black text-white px-4 text-sm disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
      </div>

      {err && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      {/* Client meta */}
      {data && (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Meta label="Lead ID" value={client.lead_id} mono />
            <Meta label="Client" value={client.client_name} />
            <Meta label="PAN" value={client.pan} mono />
            <Meta label="Registered" value={fmtDate(client.registration_date)} />
            <Meta label="Email" value={client.email} />
            <Meta label="Mobile" value={client.mobile} mono />
            <Meta label="Product/Service" value={client.product} />
            <Meta label="Branch" value={client.branch_name} />
            <Meta label="Primary Emp Code" value={client.employee_primary_code} mono />
            <Meta label="Primary Emp Name" value={client.employee_primary_name} />
            <Meta label="Service Start" value={fmtDate(client.service_start)} />
            <Meta label="Service End" value={fmtDate(client.service_end)} />
            <Meta label="Lead Source" value={client.lead_source} />
            <Meta label="Lead Response" value={client.lead_response} />
          </div>

          {(client.address || client.city || client.state || client.pincode) && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Meta label="Address" value={client.address} className="sm:col-span-2" />
              <Meta label="City" value={client.city} />
              <Meta label="State" value={client.state} />
              <Meta label="Pincode" value={client.pincode} />
            </div>
          )}
        </div>
      )}

      {/* Assignments + Summary */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
            <div className="text-sm font-medium mb-2">Assignments</div>
            {assignments.length === 0 ? (
              <div className="text-sm text-gray-500">No assignments</div>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <table className="min-w-[500px] w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <Th>Employee Code</Th>
                      <Th>Employee Name</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a, i) => (
                      <tr key={i} className="border-t">
                        <Td className="font-mono">{a.employee_code || "—"}</Td>
                        <Td>{a.employee_name || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm font-medium mb-2">Payments Summary</div>
            <div className="space-y-2">
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
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-medium">All Payments</div>
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
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
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500">No payments</td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <Td className="font-mono">{p.id ?? "—"}</Td>
                    <Td>{p.status || "—"}</Td>
                    <Td>{p.paid_amount != null ? moneyINR(p.paid_amount) : "—"}</Td>
                    <Td>{p.payment_mode || "—"}</Td>
                    <Td className="font-mono">{p.reference_no || "—"}</Td>
                    <Td>{fmtDate(p.created_at)}</Td>
                    <Td>{fmtDate(p.updated_at)}</Td>
                    <Td>{p.notes || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      className={
        "px-4 py-2 text-sm border-b-2 -mb-px " +
        (active ? "border-black font-medium" : "border-transparent text-gray-600 hover:text-black")
      }
    >
      {children}
    </button>
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
function Meta({ label, value, mono, className = "" }) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={"mt-1 text-sm " + (mono ? "font-mono" : "font-medium")}>{value || "—"}</div>
    </div>
  );
}
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
