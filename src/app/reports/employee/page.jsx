"use client";
import React, { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { LineChart, BarChart3 } from "lucide-react";
import { axiosInstance } from "@/api/Axios";

function safeJSON(str) { try { return str ? JSON.parse(str) : null; } catch { return null; } }
function hexToRgba(hex, alpha = 1) {
  const h = (hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const bigint = parseInt(full || "000000", 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const num = (n) => (n ?? 0).toLocaleString();
const inr = (n) => (n ?? 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const DAY_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 180 days" },
  { value: 360, label: "Last 360 days" },
];

const defaultTheme = {
  primary: "#6D5AE6",
  primaryHover: "#5948E0",
  success: "#10B981",
  error: "#EF4444",
  text: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  cardBackground: "#FFFFFF",
  inputBackground: "#FFFFFF",
  inputBorder: "#E2E8F0",
  accent: "#14B8A6",
  secondary: "#2563EB",
  shadow: "#000000",
};

const empPerfCols = ["Employee", "Role", "Total Leads", "Converted", "FT", "CALL BACK", "Revenue"];

const Page = () => {
  const [user, setUser] = useState(null);

  // API data
  const [employeesTable, setEmployeesTable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // filters (single source of truth; fetch on change)
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", days: 30 });

  // search (debounced)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // server-side pagination
  const [empPage, setEmpPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalEmp, setTotalEmp] = useState(0);
  const [totalEmpPages, setTotalEmpPages] = useState(1);

  // row expansion
  const [expandedEmp, setExpandedEmp] = useState(new Set());

  const themeConfig = defaultTheme;

  useEffect(() => {
    const raw = Cookies.get("user_info");
    if (raw) setUser(safeJSON(raw) || null);
  }, []);

  const isEmployee = useMemo(() => {
    const role = ((user && user.role_name) || "").toString().toUpperCase();
    return role !== "SUPERADMIN" && role !== "BRANCH_MANAGER";
  }, [user]);

  // debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // reset to page 1 whenever filters or search change
  useEffect(() => {
    setEmpPage(1);
  }, [filters, debouncedSearch, pageSize]);

  const queryParamsEmp = useMemo(() => {
    const p = {};
    if (filters.fromDate) p.from_date = filters.fromDate;
    if (filters.toDate) p.to_date = filters.toDate;
    if (!filters.fromDate && !filters.toDate && filters.days) p.days = filters.days;
    p.view = "all";
    p.page = empPage;
    p.limit = pageSize;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [filters, empPage, pageSize, debouncedSearch]);

  // fetch every time query params change
  useEffect(() => {
    fetchUserTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParamsEmp]);

  const fetchUserTable = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await axiosInstance.get("/analytics/leads/users", { params: queryParamsEmp });
      const payload = res?.data || {};
      const items = Array.isArray(payload.items) ? payload.items : [];

      const rows = items.map((r) => ({
        employee_code: r.employee_code,
        employee_name: r.employee_name,
        role_id: r.role_id,
        role_name: r.role_name,
        total_leads: r.total_leads,
        converted_leads: r.converted_leads,
        total_revenue: r.total_revenue,
        response_wise: r.response_wise || {},
        FT: r.FT ?? (r.response_wise && r.response_wise.FT) ?? 0,
      }));

      setEmployeesTable(rows);
      setTotalEmp(Number(payload.total_count || 0));
      setTotalEmpPages(Math.max(1, Number(payload.total_pages || 1)));
      setEmpPage(Number(payload.page || 1));
      setPageSize(Number(payload.limit || pageSize));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load employees");
      setEmployeesTable([]);
      setTotalEmp(0);
      setTotalEmpPages(1);
    } finally {
      setLoading(false);
    }
  };

  const otherResponses = useMemo(() => {
    const set = new Set();
    (employeesTable || []).forEach((r) => {
      Object.keys(r.response_wise || {}).forEach((k) => {
        const key = (k || "").toUpperCase();
        if (key !== "FT" && key !== "CALL BACK") set.add(k);
      });
    });
    return Array.from(set).sort();
  }, [employeesTable]);

  const toggleEmp = (code) => {
    setExpandedEmp((old) => {
      const s = new Set(old);
      if (s.has(code)) s.delete(code);
      else s.add(code);
      return s;
    });
  };

  const startIdx = totalEmp === 0 ? 0 : (empPage - 1) * pageSize + 1;
  const endIdx = totalEmp === 0 ? 0 : Math.min(empPage * pageSize, totalEmp);

  return (
    <div className="p-6">
      {/* Filters + Search (no Apply button) */}
      <div className="mb-4 px-2 ">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>
              From Date
            </label>
            <input
              type="date"
              className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
              value={filters.fromDate}
              onChange={(e) => setFilters((d) => ({ ...d, fromDate: e.target.value }))}
              style={{
                backgroundColor: themeConfig.inputBackground,
                color: themeConfig.text,
                border: `1px solid ${themeConfig.inputBorder}`,
                boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || "#000", 0.05)}`,
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>
              To Date
            </label>
            <input
              type="date"
              className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
              value={filters.toDate}
              onChange={(e) => setFilters((d) => ({ ...d, toDate: e.target.value }))}
              style={{
                backgroundColor: themeConfig.inputBackground,
                color: themeConfig.text,
                border: `1px solid ${themeConfig.inputBorder}`,
                boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || "#000", 0.05)}`,
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>
              Days
            </label>
            <select
              className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
              value={filters.days}
              onChange={(e) => setFilters((d) => ({ ...d, days: Number(e.target.value) }))}
              style={{
                backgroundColor: themeConfig.inputBackground,
                color: themeConfig.text,
                border: `1px solid ${themeConfig.inputBorder}`,
                boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || "#000", 0.05)}`,
              }}
            >
              {DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Search (name / phone / employee code) */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>
              Search (name / phone / code)
            </label>
            <input
              type="text"
              placeholder="e.g. Raj / 987 / EMP01"
              className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: themeConfig.inputBackground,
                color: themeConfig.text,
                border: `1px solid ${themeConfig.inputBorder}`,
                boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || "#000", 0.05)}`,
              }}
            />
          </div>

          <div className="md:col-span-3 flex md:justify-end gap-2 items-center">
            <button
              onClick={() => {
                setFilters({ fromDate: "", toDate: "", days: 30 });
                setSearch("");
              }}
              className="h-9 px-3 rounded-md text-sm font-medium transition"
              style={{
                backgroundColor: hexToRgba(themeConfig.textSecondary, 0.15),
                color: themeConfig.text,
                border: `1px solid ${themeConfig.border}`,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      {user && (
        <TableWrap
          className="mb-6"
          title={`Employee Performance (${isEmployee ? "Your Team" : "All (scoped)"})`}
          icon={<LineChart className="h-5 w-5" style={{ color: themeConfig.success }} />}
          themeConfig={themeConfig}
        >
          <div className="px-3 pb-4">
            {loading ? (
              <div className="py-8 text-sm" style={{ color: themeConfig.textSecondary }}>Loading…</div>
            ) : err ? (
              <div className="py-8 text-sm" style={{ color: themeConfig.error }}>{err}</div>
            ) : (
              <>
                <div className="max-h-[480px] overflow-y-auto overflow-x-auto pr-1 relative">
                  <EmployeeTableAccordion
                    cols={empPerfCols}
                    rows={employeesTable}
                    otherResponses={otherResponses}
                    expanded={expandedEmp}
                    onToggle={toggleEmp}
                    themeConfig={themeConfig}
                  />
                </div>

                {/* Pagination (server-side) */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <div className="text-xs" style={{ color: themeConfig.textSecondary }}>
                    {totalEmp === 0 ? "No records" : `Showing ${startIdx}–${endIdx} of ${totalEmp}`}
                  </div>

                  <div className="flex items-center gap-2 pb-1">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-9 px-2 rounded-md text-sm border"
                      style={{ backgroundColor: themeConfig.cardBackground, color: themeConfig.text, borderColor: themeConfig.border }}
                    >
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
                    </select>

                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                      disabled={empPage === 1}
                      className="h-9 px-3 rounded-md text-sm font-medium border transition"
                      style={{
                        backgroundColor: empPage === 1 ? hexToRgba(themeConfig.surface, 0.6) : themeConfig.cardBackground,
                        color: empPage === 1 ? hexToRgba(themeConfig.textSecondary, 0.7) : themeConfig.text,
                        borderColor: themeConfig.border,
                        cursor: empPage === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      Previous
                    </button>

                    <span className="text-sm" style={{ color: themeConfig.text }}>
                      Page <span className="font-medium">{empPage}</span> / {totalEmpPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
                      disabled={empPage === totalEmpPages}
                      className="h-9 px-3 rounded-md text-sm font-medium border transition"
                      style={{
                        backgroundColor: empPage === totalEmpPages ? hexToRgba(themeConfig.surface, 0.6) : themeConfig.cardBackground,
                        color: empPage === totalEmpPages ? hexToRgba(themeConfig.textSecondary, 0.7) : themeConfig.text,
                        borderColor: themeConfig.border,
                        cursor: empPage === totalEmpPages ? "not-allowed" : "pointer",
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TableWrap>
      )}
    </div>
  );
};

export default Page;

function TableWrap({ title, children, icon, className = "", themeConfig }) {
  return (
    <div className={`rounded-2xl ${className} shadow-xl`} style={{ backgroundColor: themeConfig.cardBackground, border: `1px solid ${themeConfig.border}` }}>
      <div className="flex items-center p-6 justify-between rounded-t-2xl" style={{ backgroundColor: themeConfig.surface, borderBottom: `1px solid ${themeConfig.border}` }}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-base rupee">{icon}</span>}
          <h3 className="text-base font-semibold rupee" style={{ color: themeConfig.text }}>{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

function EmployeeTableAccordion({ cols = [], rows = [], otherResponses = [], expanded, onToggle, themeConfig }) {
  return (
    <div className="overflow-x-auto w-full" style={{ backgroundColor: themeConfig.cardBackground, boxShadow: `0 12px 24px ${hexToRgba(themeConfig.shadow || "#000", 0.12)}` }}>
      <table className="min-w-full text-sm" style={{ color: themeConfig.text }}>
        <thead className="sticky top-0 z-10">
          <tr className="backdrop-blur" style={{ backgroundColor: hexToRgba(themeConfig.cardBackground, 0.95), borderBottom: `1px solid ${themeConfig.border}` }}>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold text-left" style={{ color: themeConfig.text }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center" style={{ color: themeConfig.textSecondary }} colSpan={cols.length}>
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((u) => {
              const map = u && u.response_wise ? u.response_wise : {};
              const code = u.employee_code;
              const isOpen = expanded && expanded.has && expanded.has(code);

              return (
                <React.Fragment key={code}>
                  <tr
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-expanded={!!isOpen}
                    aria-controls={`emp-acc-${code}`}
                    onClick={() => onToggle(code)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle(code);
                      }
                    }}
                    style={{ borderBottom: `1px solid ${hexToRgba(themeConfig.border, 0.8)}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.04); }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium inline-flex items-center gap-2" style={{ color: themeConfig.text }}>
                        {u.employee_name} <span style={{ color: themeConfig.textSecondary }}>({code})</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.textSecondary }}>{u.role_name || u.role_id}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.accent }}>{num(u.total_leads)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.primary }}>{num(u.converted_leads)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.primaryHover || themeConfig.primary }}>{num(u.FT ?? (map && map["FT"]) ?? 0)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.secondary }}>{num(map && map["CALL BACK"] ? map["CALL BACK"] : 0)}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: themeConfig.error }}>{inr(u.total_revenue)}</td>
                  </tr>

                  {isOpen && (
                    <tr id={`emp-acc-${code}`} style={{ backgroundColor: themeConfig.surface, borderBottom: `1px solid ${themeConfig.border}` }}>
                      <td className="px-3 py-3" colSpan={cols.length}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {otherResponses.map((name) => (
                            <div
                              key={`${code}-${name}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg"
                              style={{ backgroundColor: themeConfig.cardBackground, border: `1px solid ${themeConfig.border}` }}
                            >
                              <span className="text-xs" style={{ color: themeConfig.textSecondary }}>{name}</span>
                              <span className="text-sm font-semibold" style={{ color: themeConfig.text }}>{num((map && map[name]) ?? 0)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
