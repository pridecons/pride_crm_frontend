"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Download, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";

/* utils */
const todayISO = () => new Date().toISOString().slice(0, 10);
const agoISO = (d = 7) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

export default function ExportClientsButton({
  className = "",
  apiBase = "https://crm.24x7techelp.com",
  defaultFrom = "",
  defaultTo = "",
  defaultDays = 30,
  defaultBranchId = undefined,
  defaultEmployeeId = "",
}) {
  /* main trigger state */
  const [chooserOpen, setChooserOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [format, setFormat] = useState("xlsx"); // "xlsx" | "csv"
  const [loading, setLoading] = useState(false);

  /* filter state */
  const [fromDate, setFromDate] = useState(defaultFrom || agoISO(7));
  const [toDate, setToDate] = useState(defaultTo || todayISO());
  const [days, setDays] = useState(String(defaultDays ?? 30));
  const [branchId, setBranchId] = useState(
    defaultBranchId !== undefined && defaultBranchId !== null ? String(defaultBranchId) : ""
  );
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || "");

  /* branches data */
  const [branches, setBranches] = useState([]); // [{id,name}]
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");

  /* employees (Sales only) */
  const [employees, setEmployees] = useState([]); // [{code,name,branch_id}]
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");

  /* employee autocomplete */
  const [empQuery, setEmpQuery] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const empWrapRef = useRef(null);

  /* close menus on outside click */
  const rootRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setChooserOpen(false);
      if (empWrapRef.current && !empWrapRef.current.contains(e.target)) setEmpOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const openModalFor = (fmt) => {
    setFormat(fmt);
    setChooserOpen(false);
    setTimeout(() => setModalOpen(true), 0);
  };

  /* load branches on modal open */
  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setBranchesLoading(true);
        setBranchesError("");
        const res = await axiosInstance.get("/api/v1/branches/", {
          baseURL: apiBase,
          params: { skip: 0, limit: 100, active_only: false },
        });
        const list = Array.isArray(res.data?.branches)
          ? res.data.branches
          : Array.isArray(res.data)
          ? res.data
          : [];
        if (!cancelled) setBranches(list);
      } catch (err) {
        if (!cancelled) {
          setBranches([]);
          setBranchesError("Could not load branches");
        }
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, apiBase]);

  /* load employees on modal open (Sales-only) */
  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setEmployeesLoading(true);
        setEmployeesError("");
        const token =
          typeof window !== "undefined" ? document.cookie.match(/access_token=([^;]+)/)?.[1] ?? null : null;
        const res = await axiosInstance.get("/api/v1/users/", {
          baseURL: apiBase,
          params: { skip: 0, limit: 100, active_only: false },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const raw =
          Array.isArray(res.data?.users)
            ? res.data.users
            : Array.isArray(res.data?.data?.users)
            ? res.data.data.users
            : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
            ? res.data
            : [];

        const isSales = (u) => {
          const depId = u?.department_id ?? u?.department?.id ?? u?.profile_department_id ?? null;
          const depName = String(u?.department_name ?? u?.department?.name ?? u?.profile_department?.name ?? "")
            .toUpperCase()
            .trim();
          const roleName = String(u?.profile_role?.name ?? u?.role_name ?? u?.role ?? "")
            .toUpperCase()
            .trim();
          const hasSalesWord =
            depName.includes("SALES") ||
            depName.includes("SALES_TEAM") ||
            depName.includes("SALES TEAM") ||
            roleName.includes("SALES") ||
            roleName.includes("SALES_TEAM") ||
            roleName.includes("SALES TEAM");
          return depId === 4 || hasSalesWord;
        };

        const mapped = raw
          .filter(isSales)
          .map((u) => {
            const code =
              u?.employee_code ?? u?.employee_id ?? u?.user?.employee_code ?? u?.id ?? "";
            const name = u?.name ?? u?.full_name ?? u?.user?.name ?? u?.username ?? "";
            return {
              code: String(code).trim(),
              name: String(name).trim(),
              branch_id: u?.branch_id ?? u?.branch?.id ?? null,
            };
          })
          .filter((u) => u.code || u.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) setEmployees(mapped);
      } catch (err) {
        if (!cancelled) {
          setEmployees([]);
          setEmployeesError("Could not load employees");
        }
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, apiBase]);

  /* tie label to selection when employees arrive */
  useEffect(() => {
    if (!employeeId || empQuery) return;
    const sel = employees.find((e) => e.code === employeeId);
    if (sel) setEmpQuery(`${sel.name} (${sel.code})`);
  }, [employees, employeeId, empQuery]);

  /* filter by branch */
  const visibleEmployees = useMemo(() => {
    if (!branchId) return employees;
    const bid = String(branchId);
    return employees.filter((e) => (e.branch_id == null ? true : String(e.branch_id) === bid));
  }, [employees, branchId]);

  /* filter by query */
  const filteredEmployees = useMemo(() => {
    const q = empQuery.trim().toLowerCase();
    if (!q) return visibleEmployees;
    return visibleEmployees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    );
  }, [visibleEmployees, empQuery]);

  const filename = `clients_export_${fromDate || "from"}_to_${toDate || "to"}.${format}`;

  async function handleDownload() {
    try {
      setLoading(true);
      const params = {
        from_date: fromDate || null,
        to_date: toDate || null,
        days: days ? Number(days) : null,
        branch_id: branchId || null,
        employee_id: employeeId || null,
        fmt: format,
      };
      Object.keys(params).forEach((k) => {
        if (params[k] === null || params[k] === "" || Number.isNaN(params[k])) delete params[k];
      });

      const res = await axiosInstance.get(`/api/v1/reports/clients/export`, {
        baseURL: apiBase,
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Export ready!");
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      {/* Download button */}
      <button
        type="button"
        onClick={() => setChooserOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-semibold shadow-sm transition
                   bg-[var(--theme-components-button-primary-bg)]
                   text-[var(--theme-components-button-primary-text)]
                   border-[var(--theme-components-button-primary-bg)]
                   hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Download
      </button>

      {/* XLSX/CSV chooser */}
      {chooserOpen && (
        <div
          className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border shadow-lg z-[60]
                     bg-[var(--theme-components-card-bg)]
                     border-[var(--theme-components-card-border)]"
        >
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
            onClick={() => openModalFor("xlsx")}
          >
            XLSX
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
            onClick={() => openModalFor("csv")}
          >
            CSV
          </button>
        </div>
      )}

      {/* Backdrop */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/40" onClick={() => (!loading ? setModalOpen(false) : null)} />
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-xl border shadow-xl
                       bg-[var(--theme-components-card-bg)]
                       border-[var(--theme-components-card-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-components-card-border)]">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                <h3 className="font-semibold">{format.toUpperCase()} Export</h3>
              </div>
              <button
                className="p-1 rounded hover:bg-black/5"
                onClick={() => (!loading ? setModalOpen(false) : null)}
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dates */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)] outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)] outline-none focus:ring-2"
                />
              </div>

              {/* Days fallback */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">Days (fallback)</label>
                <input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)] outline-none focus:ring-2"
                  placeholder="30"
                />
              </div>

              {/* Branch dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value);
                    setEmployeeId("");
                    setEmpQuery("");
                  }}
                  className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)] outline-none focus:ring-2"
                >
                  <option value="">All branches</option>
                  {branchesLoading && <option value="" disabled>Loading…</option>}
                  {!branchesLoading && branchesError && <option value="" disabled>{branchesError}</option>}
                  {!branchesLoading && !branchesError && branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name ?? `Branch #${b.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee autocomplete */}
              <div ref={empWrapRef} className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">
                  Employee (Sales Team)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={empQuery}
                    placeholder={
                      employeesLoading
                        ? "Loading employees…"
                        : employeesError
                        ? "Failed to load employees"
                        : "Type to search name/code"
                    }
                   onChange={(e) => {
   const v = e.target.value;
   setEmpQuery(v);
   // open only when there is text; close when cleared
   const shouldOpen = v.trim().length > 0 && !employeesLoading && !employeesError;
   setEmpOpen(shouldOpen);
   if (employeeId) setEmployeeId("");
 }}
                    className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)] outline-none focus:ring-2"
                    autoComplete="off"
                  />
                  {empQuery && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded border"
                      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-textSecondary)" }}
                      onClick={() => { setEmpQuery(""); setEmployeeId(""); setEmpOpen(false); }}
                    >
                      Clear
                    </button>
                  )}

                  {empOpen && !employeesLoading && !employeesError && (
                    <div
                      className="absolute z-[90] mt-1 w-full max-h-60 overflow-auto rounded-lg border shadow-lg"
                      style={{ background: "var(--theme-components-card-bg)", borderColor: "var(--theme-components-card-border)" }}
                    >
                      {filteredEmployees.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">No matches</div>
                      ) : (
                        filteredEmployees.slice(0, 50).map((emp) => (
                          <button
                            key={emp.code}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--theme-surface)]"
                            style={{ color: "var(--theme-text)" }}
                            onClick={() => {
                              setEmployeeId(emp.code);
                              setEmpQuery(`${emp.name} (${emp.code})`);
                              setEmpOpen(false);
                            }}
                          >
                            <div className="font-medium truncate">{emp.name}</div>
                            <div className="text-[11px] text-[var(--theme-textSecondary)]">{emp.code}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "var(--theme-textSecondary)" }}>
                  {employeeId ? `Selected: ${employeeId}` : "All employees"}
                </div>
              </div>

              {/* Format (read-only) */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">Format</label>
                <input
                  value={format.toUpperCase()}
                  readOnly
                  className="w-full rounded-lg border px-3 py-2 bg-[var(--theme-surface)] border-[var(--theme-border)]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex items-center justify-end gap-3 border-t border-[var(--theme-components-card-border)]">
              <button
                className="px-3.5 py-2 text-sm rounded-lg border hover:bg-black/5"
                onClick={() => (!loading ? setModalOpen(false) : null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-3.5 py-2 text-sm rounded-lg border font-semibold shadow-sm
                           bg-[var(--theme-components-button-primary-bg)]
                           text-[var(--theme-components-button-primary-text)]
                           border-[var(--theme-components-button-primary-bg)]
                           hover:opacity-90 disabled:opacity-60"
                onClick={handleDownload}
                disabled={loading}
              >
                {loading ? "Exporting…" : `Export ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
