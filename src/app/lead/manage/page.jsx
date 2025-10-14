"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { useRouter } from "next/navigation";
import {
  Database,
  Users,
  CheckCircle,
  Clock,
  Search,
  Edit3,
  Trash2,
  TrendingUp,
  Activity,
  X,
  BookOpenText,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import LoadingState from "@/components/LoadingState";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";

/* ---------- helpers ---------- */
/* ---------- dynamic role helpers (API + cache) ---------- */
const canonRole = (s) => {
  if (!s) return "";
  let x = String(s).trim().toUpperCase().replace(/\s+/g, "_");
  if (x === "SUPER_ADMINISTRATOR") x = "SUPERADMIN";
  return x;
};

function buildRoleMap(list) {
  const out = {};
  (Array.isArray(list) ? list : []).forEach((r) => {
    const id = r?.id != null ? String(r.id) : "";
    const key = canonRole(r?.name);
    if (id && key) out[id] = key;
  });
  return out;
}

async function loadRoleMap() {
  try {
    const cached = JSON.parse(localStorage.getItem("roleMap") || "{}");
    if (cached && typeof cached === "object" && Object.keys(cached).length) {
      return cached;
    }
  } catch { }

  try {
    const res = await axiosInstance.get("/profile-role/", {
      params: { skip: 0, limit: 100, order_by: "hierarchy_level" },
    });
    const map = buildRoleMap(res?.data);
    if (Object.keys(map).length) localStorage.setItem("roleMap", JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

function getEffectiveRole({ accessToken, userInfo, roleMap = {} }) {
  try {
    if (accessToken) {
      const d = jwtDecode(accessToken) || {};
      const jwtRole =
        d.role_name || d.role || d.profile_role?.name || d.user?.role_name || d.user?.role || "";
      const r1 = canonRole(jwtRole);
      if (r1) return r1;

      const jwtRoleId = d.role_id ?? d.user?.role_id ?? d.profile_role?.id ?? null;
      if (jwtRoleId != null) {
        const mapped = roleMap[String(jwtRoleId)];
        if (mapped) return mapped;
      }
    }
  } catch { }

  if (userInfo) {
    const uiRole =
      userInfo.role_name ||
      userInfo.role ||
      userInfo.profile_role?.name ||
      userInfo.user?.role_name ||
      userInfo.user?.role ||
      "";
    const r3 = canonRole(uiRole);
    if (r3) return r3;

    const uiRoleId =
      userInfo.role_id ?? userInfo.user?.role_id ?? userInfo.profile_role?.id ?? null;
    if (uiRoleId != null) {
      const mapped = roleMap[String(uiRoleId)];
      if (mapped) return mapped;
    }
  }
  return "";
}

const displayRole = (key) => (key || null);

// Hook that returns the canonical role key
function useRoleKey() {
  const [roleKey, setRoleKey] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ck = Cookies.get("role_key");
        if (ck) {
          if (alive) setRoleKey(canonRole(ck));
          return;
        }

        const roleMap = await loadRoleMap();
        const token = Cookies.get("access_token");
        const uiRaw = Cookies.get("user_info");
        const userInfo = uiRaw ? JSON.parse(uiRaw) : null;
        const computed = getEffectiveRole({ accessToken: token, userInfo, roleMap });
        if (alive) setRoleKey(computed);
      } catch {
        if (alive) setRoleKey("");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return roleKey;
}

const LeadManage = () => {
  const router = useRouter();

  // Data
  const [leadData, setLeadData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allSources, setAllSources] = useState([]);
  const [responsesList, setResponsesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [responseFilter, setResponseFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All");

  // Employee autocomplete
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // Accordion
  const [openLead, setOpenLead] = useState(null);
  // Cards
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applyDateFilter, setApplyDateFilter] = useState(false);

  // Cards
  const [dashboardData, setDashboardData] = useState(null);

  /* ---------- pagination ---------- */
  const [page, setPage] = useState(1);      // 1-based
  const [limit, setLimit] = useState(50);   // match your API limit
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [role, setRole] = useState(null); // normalized role_name
  const roleKey = useRoleKey();
  const [ready, setReady] = useState(false); // when role is resolved

  const isSuperAdmin = roleKey === "SUPERADMIN";

  // Story & Comments modals
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLeadId, setStoryLeadId] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentLeadId, setCommentLeadId] = useState(null);

  async function fetchAllPaginated(path, { limit = 100, dataKey = "data" } = {}) {
    const out = [];
    let skip = 0;
    while (true) {
      const { data } = await axiosInstance.get(path, { params: { skip, limit } });
      const pageItems = data?.[dataKey] || [];
      out.push(...pageItems);

      const total = data?.pagination?.total ?? pageItems.length;
      if (out.length >= total || pageItems.length < limit) break;
      skip += limit;
    }
    return out;
  }

  useEffect(() => {
    try {
      setRole(displayRole(roleKey));
    } catch (e) {
      console.error("Failed to read user info from cookies/JWT", e);
    } finally {
      setReady(true);
    }
  }, [roleKey]);

  /* ---------- load dropdown lists ---------- */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const loadFilterLists = async () => {
      try {
        const [allEmps, sRes, rRes] = await Promise.all([
          fetchAllPaginated("/users/", { limit: 100, dataKey: "data" }), // <— fetch ALL pages
          axiosInstance.get("/lead-config/sources/?skip=0&limit=100"),
          axiosInstance.get("/lead-config/responses/?skip=0&limit=100"),
        ]);

        const allSrc = Array.isArray(sRes.data) ? sRes.data : [];
        const allResp = Array.isArray(rRes.data) ? rRes.data : [];

        // Save the master list once
        setAllEmployees(allEmps);

        if (isSuperAdmin) {
          // IMPORTANT: use freshly fetched array (allEmps), not state (allEmployees)
          const scopedEmployees = allEmps;
          setEmployees(scopedEmployees);
        } else {
          setEmployees(allEmps);
        }

        setAllSources(allSrc);
        setResponsesList(allResp);
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    };

    loadFilterLists();
    return () => {
      cancelled = true;
    };
  }, [ready, isSuperAdmin]);

  /* ---------- load leads (server-side filtering) ---------- */
  useEffect(() => {
    if (!ready) return;

    const fetchLeadData = async () => {
      try {
        setLoading(true);

        const params = {
          skip: (page - 1) * limit,
          limit,
          kyc_only: false,
          view: "all",
        };

        if (employeeFilter !== "All") {
          params.assigned_to_user = String(employeeFilter).trim().toUpperCase();
        }

        if (sourceFilter !== "All") params.lead_source_id = sourceFilter;
        if (responseFilter !== "All") params.response_id = responseFilter;

        if (searchQuery.trim()) params.search = searchQuery.trim();


        if (kycFilter === "Completed") {
          params.kyc_only = true;
        } else if (kycFilter === "Pending") {
          params.kyc_only = false;
        }

        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        const { data } = await axiosInstance.get("/leads/", { params });
        setLeadData(Array.isArray(data?.leads) ? data.leads : []);
        // read server meta
        setTotalItems(Number(data?.total_items ?? 0));
        setTotalPages(Number(data?.total_pages ?? 0));
      } catch (error) {
        console.error("Lead fetch failed:", error);
        setLeadData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [
    ready,
    isSuperAdmin,
    employeeFilter,
    sourceFilter,
    responseFilter,
    kycFilter,
    searchQuery,
    applyDateFilter,
    page,
    limit,
  ]);

  /* ---------- quick cards (admins only) ---------- */
  /* ---------- quick cards (everyone) ---------- */
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    (async () => {
      try {
        const params = { days: 30 };

        const { data } = await axiosInstance.get(
          "/analytics/leads/admin/dashboard-card",
          { params }
        );
        if (!cancelled) setDashboardData(data);
      } catch {
        if (!cancelled) setDashboardData(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, isSuperAdmin]);

  /* ---------- name helpers (prefer embedded object, fall back to cached lists) ---------- */
  const sourcesMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(allSources) ? allSources : []).forEach(s => m.set(String(s.id), s.name));
    return m;
  }, [allSources]);

  const responsesMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(responsesList) ? responsesList : []).forEach(r => m.set(String(r.id), r.name));
    return m;
  }, [responsesList]);

  // Map employee_code → display name
  const employeesMap = useMemo(() => {
    const m = new Map();
    (Array.isArray(allEmployees) ? allEmployees : []).forEach((e) => {
      const code = String(e?.employee_code || "").trim().toUpperCase();
      if (!code) return;
      const display =
        e?.name ||
        e?.full_name ||
        e?.email ||
        e?.username ||
        code; // sensible fallback
      m.set(code, display);
    });
    return m;
  }, [allEmployees]);

  // Prefer embedded assigned_user.name; fallback to employeesMap by code
  function getAssignedName(leadOrCode) {
    // If a lead object is passed
    if (leadOrCode && typeof leadOrCode === "object") {
      const embedded = leadOrCode?.assigned_user?.name;
      if (embedded) return embedded;
      const code = String(leadOrCode?.assigned_to_user || "").trim().toUpperCase();
      if (!code) return "—";
      return employeesMap.get(code) || code;
    }
    // If a plain code is passed
    const code = String(leadOrCode || "").trim().toUpperCase();
    if (!code) return "—";
    return employeesMap.get(code) || code;
  }

  function getSourceName(leadOrId) {
    // prefer embedded name
    if (leadOrId && typeof leadOrId === "object") {
      const embedded = leadOrId?.lead_source?.name;
      if (embedded) return embedded;
      const id = leadOrId?.lead_source_id;
      return id == null ? "—" : (sourcesMap.get(String(id)) || String(id));
    }
    // called with id
    const id = leadOrId;
    return id == null ? "—" : (sourcesMap.get(String(id)) || String(id));
  }

  function getResponseName(leadOrId) {
    if (leadOrId && typeof leadOrId === "object") {
      const embedded = leadOrId?.lead_response?.name;
      if (embedded) return embedded;
      const id = leadOrId?.lead_response_id;
      return id == null ? "—" : (responsesMap.get(String(id)) || String(id));
    }
    const id = leadOrId;
    return id == null ? "—" : (responsesMap.get(String(id)) || String(id));
  }

  const getEmployeeName = (code) => {
    const c = String(code ?? "").trim();
    if (!c) return "—";
    return (
      allEmployees.find(
        (e) =>
          String(e.employee_code).trim().toUpperCase() === c.toUpperCase()
      )?.name || c
    );
  };

  /* ---------- options ---------- */
  const sourcesScoped = useMemo(() => {
    const list = Array.isArray(allSources) ? allSources : [];

    if (isSuperAdmin) {
      const seen = new Set();
      const dedup = [];
      for (const s of list) {
        const key = String(s?.name ?? "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        dedup.push(s);
      }
      return dedup.sort((a, b) =>
        String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
          sensitivity: "base",
        })
      );
    }

    return list;
  }, [allSources, isSuperAdmin]);

  const sourceOptions = useMemo(
    () => [
      { value: "All", label: "All Sources" },
      ...(sourcesScoped || []).map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [sourcesScoped]
  );

  const responseOptions = useMemo(
    () => [
      { value: "All", label: "All Responses" },
      ...responsesList.map((r) => ({ value: String(r.id), label: r.name })),
    ],
    [responsesList]
  );

  /* ---------- filtering (server already did it) ---------- */
  const filteredLeads = useMemo(() => leadData, [leadData]);


  useEffect(() => {
    setPage(1);
    setOpenLead(null);
  }, [searchQuery, employeeFilter, sourceFilter, responseFilter, kycFilter, applyDateFilter]);


  useEffect(() => {
    setOpenLead(null);
  }, [page]);

  const totalLeads = leadData.length;

  // helper near top or inside component
  const buildPageList = (curr, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, 2, total - 1, total, curr - 1, curr, curr + 1]);
    const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < sorted.length; i++) {
      out.push(sorted[i]);
      if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) out.push("…");
    }
    return out;
  };

  /* ---------- employee autocomplete ---------- */
  const empMatches = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return [];
    const pool = isSuperAdmin && employees;
    return pool
      .filter(
        (e) =>
          e?.name?.toLowerCase().includes(q) ||
          String(e.employee_code || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [employeeQuery, employees, allEmployees, isSuperAdmin]);

  const handleEmployeeSelect = (emp) => {
    setEmployeeFilter(String(emp.employee_code));
    setEmployeeQuery(emp.name || String(emp.employee_code));
    setShowEmpDrop(false);
  };

  const clearEmployee = () => {
    setEmployeeFilter("All");
    setEmployeeQuery("");
    setShowEmpDrop(false);
  };

  /* ================ UI (Theme variables only for colors) ================ */
  const openStory = (leadId) => {
    setStoryLeadId(leadId);
    setIsStoryModalOpen(true);
  };
  const openComments = (leadId) => {
    setCommentLeadId(leadId);
    setIsCommentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-background)] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">

        <div className="flex items-center justify-between">
          {/* Date Filter */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-1">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-[var(--theme-border)] rounded-lg px-3 py-2 bg-[var(--theme-input-background)] text-[var(--theme-text)]"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-1">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-[var(--theme-border)] rounded-lg px-3 py-2 
                 bg-[var(--theme-input-background)] text-[var(--theme-text)] 
                 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]
                 hover:bg-[var(--theme-primary-softer)]"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mb-1">
              <button
                type="button"
                onClick={() => setApplyDateFilter((prev) => !prev)} // ✅ trigger API refetch
                className="px-3 py-2 rounded-lg bg-[var(--theme-primary)] text-white 
                 hover:opacity-90 transition-all border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]"
              >
                Apply
              </button>

              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setApplyDateFilter((prev) => !prev); // reset trigger
                }}
                className="px-2 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-[var(--theme-surface)] rounded-full px-4 py-2 shadow-sm border border-[var(--theme-border)]">
              <span className="text-sm font-medium text-[var(--theme-text)]">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {/* Quick Stats (visible to all) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Leads */}
        <div className="group bg-[var(--theme-card-bg)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">
                Total Leads
              </p>
              <p className="text-3xl font-bold text-[var(--theme-text)]">
                {totalItems}
              </p>
              <p className="text-xs text-[var(--theme-success)] flex items-center gap-1">
                <TrendingUp size={12} /> Active pipeline
              </p>
            </div>
            <div className="rounded-full p-3 bg-[var(--theme-primary-softer)]">
              <Users size={24} className="text-[var(--theme-primary)]" />
            </div>
          </div>
        </div>

        {/* Old Leads */}
        <div className="group bg-[var(--theme-card-bg)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">
                Old Leads
              </p>
              <p className="text-3xl font-bold text-[var(--theme-text)]">
                {dashboardData?.overall?.old_leads ?? "--"}
              </p>
              <p className="text-xs text-[var(--theme-warning)] flex items-center gap-1">
                <Clock size={12} /> Existing pipeline
              </p>
            </div>
            <div className="rounded-full p-3 bg-[var(--theme-primary-softer)]">
              <Clock size={24} className="text-[var(--theme-warning)]" />
            </div>
          </div>
        </div>

        {/* New Leads */}
        <div className="group bg-[var(--theme-card-bg)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">
                New Leads
              </p>
              <p className="text-3xl font-bold text-[var(--theme-text)]">
                {dashboardData?.overall?.new_leads ?? "--"}
              </p>
              <p className="text-xs text-[var(--theme-success)] flex items-center gap-1">
                <CheckCircle size={12} /> Recently added
              </p>
            </div>
            <div className="rounded-full p-3 bg-[var(--theme-primary-softer)]">
              <CheckCircle size={24} className="text-[var(--theme-success)]" />
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="group bg-[var(--theme-card-bg)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">
                Clients
              </p>
              <p className="text-3xl font-bold text-[var(--theme-text)]">
                {dashboardData?.overall?.total_clients ?? "--"}
              </p>
              <p className="text-xs text-[var(--theme-accent)] flex items-center gap-1">
                <Database size={12} /> Converted leads
              </p>
            </div>
            <div className="rounded-full p-3 bg-[var(--theme-primary-softer)]">
              <Database size={24} className="text-[var(--theme-accent)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ========= Leads Panel (sticky header + sticky footer) ========= */}
      <div className="relative rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden mt-8 bg-[var(--theme-card-bg)]">
        {/* Sticky Header (columns / caption) */}
        <div className="sticky top-0 z-20 bg-[var(--theme-card-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--theme-card-bg)]/80 border-b border-[var(--theme-border)]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-10 pr-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-input-background)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all duration-200 placeholder-[var(--theme-text-muted)]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Employee Autocomplete */}
              <div className="relative w-full sm:w-64">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search Employee..."
                    className="w-full px-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-input-background)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all duration-200 placeholder-[var(--theme-text-muted)]"
                    value={employeeQuery}
                    onChange={(e) => {
                      setEmployeeQuery(e.target.value);
                      setShowEmpDrop(true);
                      if (employeeFilter !== "All") setEmployeeFilter("All");
                    }}
                    onFocus={() => setShowEmpDrop(Boolean(employeeQuery))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault();
                    }}
                  />
                  {(employeeFilter !== "All" || employeeQuery) && (
                    <button
                      className="p-2 rounded hover:bg-[var(--theme-primary-softer)] text-[var(--theme-text)]"
                      onClick={clearEmployee}
                      title="Clear"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {showEmpDrop && empMatches.length > 0 && (
                  <div
                    className="absolute top-full left-0 w-full bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-lg shadow max-h-56 overflow-y-auto z-10"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {empMatches.map((emp) => (
                      <div
                        key={emp.employee_code}
                        onClick={() => handleEmployeeSelect(emp)}
                        className="px-4 py-2 hover:bg-[var(--theme-primary-softer)] cursor-pointer"
                      >
                        <div className="font-medium text-[var(--theme-text)]">{emp.name}</div>
                        <div className="text-xs text-[var(--theme-text-muted)]">
                          Code: {emp.employee_code}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KYC */}
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="px-4 py-3 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)]  focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all duration-200 placeholder-[var(--theme-text-muted)]"
                title="Filter by KYC status"
              >
                <option value="All">All KYC</option>
                <option value="Completed">KYC Completed</option>
                <option value="Pending">KYC Pending</option>
              </select>

              {/* Source */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-4 py-3 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all duration-200 placeholder-[var(--theme-text-muted)]"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Response */}
              <select
                value={responseFilter}
                onChange={(e) => setResponseFilter(e.target.value)}
                className="px-4 py-3 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all duration-200 placeholder-[var(--theme-text-muted)]"
              >
                {responseOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="max-h-[66vh] overflow-auto divide-y divide-[var(--theme-border)]">
          {loading ? (
            <LoadingState message="Loading leads..." />
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-[var(--theme-surface)] rounded-full p-6 mb-4">
                <Users size={48} className="text-[var(--theme-text-muted)]" />
              </div>
              <p className="text-[var(--theme-text-muted)] text-lg font-medium mb-2">
                No leads found
              </p>
              <p className="text-[var(--theme-text-muted)] text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            leadData.map((lead) => {
              const isOpen = openLead === lead.id;
              return (
                <div key={lead.id} className="bg-[var(--theme-card-bg)]">
                  <div className="w-full flex justify-between items-center px-4 sm:px-6 py-4 hover:bg-[var(--theme-primary-softer)] transition">
                    {/* Left: Lead summary with chevron */}
                    <button
                      onClick={() => setOpenLead(isOpen ? null : lead.id)}
                      aria-expanded={isOpen}
                      className="text-left flex-1 flex items-start gap-3"
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      {/* Chevron on the left */}
                      <span
                        className={[
                          "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded",
                          "text-[var(--theme-text-muted)] transition-transform duration-200",
                          isOpen ? "rotate-90" : "rotate-0",
                        ].join(" ")}
                      >
                        <ChevronRight size={18} />
                      </span>

                      {/* Texts */}
                      <span className="min-w-0">
                        <div className="font-semibold text-[var(--theme-text)] truncate">
                          {lead.full_name || "—"}{" "}
                          <span className="text-xs text-[var(--theme-text-muted)]">#{lead.id}</span>
                        </div>
                        <div className="text-sm text-[var(--theme-text-muted)] truncate">
                          {lead.mobile || "—"} • {getResponseName(lead)} • {getSourceName(lead)} • {getAssignedName(lead)}
                        </div>
                      </span>
                    </button>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/lead/${lead.id}`)}
                        className="p-2 text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                        title="Edit lead"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => openStory(lead.id)}
                        className="p-2 text-[var(--theme-accent)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                        title="View Story"
                      >
                        <BookOpenText size={18} />
                      </button>

                      <button
                        onClick={() => openComments(lead.id)}
                        className="p-2 text-[var(--theme-success)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                        title="Comments"
                      >
                        <MessageCircle size={16} />
                      </button>

                      <button
                        className="p-2 text-[var(--theme-danger)] hover:bg-[var(--theme-danger-soft)] rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="px-4 sm:px-6 pb-5 text-sm text-[var(--theme-text)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div><span className="font-medium">Email:</span> {lead.email || "—"}</div>
                      <div><span className="font-medium">PAN:</span> {lead.pan || "—"}</div>
                      <div>
                        <span className="font-medium">Assigned To:</span>{" "}
                        {getAssignedName(lead)}
                      </div>
                      <div><span className="font-medium">City:</span> {lead.city || "—"}</div>
                      <div><span className="font-medium">State:</span> {lead.state || "—"}</div>
                      <div>
                        <span className="font-medium">Segment:</span>{" "}
                        {Array.isArray(lead.segment) ? lead.segment.join(", ") : lead.segment || "—"}
                      </div>
                      <div><span className="font-medium">Investment:</span> {lead.investment ?? "—"}</div>
                      <div>
                        <span className="font-medium">Response Changed:</span>{" "}
                        {lead.response_changed_at ? new Date(lead.response_changed_at).toLocaleString("en-IN") : "—"}
                      </div>
                      <div>
                        <span className="font-medium">Conversion Deadline:</span>{" "}
                        {lead.conversion_deadline ? new Date(lead.conversion_deadline).toLocaleString("en-IN") : "—"}
                      </div>
                      <div>
                        <span className="font-medium">Created At:</span>{" "}
                        {lead.created_at ? new Date(lead.created_at).toLocaleString("en-IN") : "—"}
                      </div>

                      <div className="col-span-full flex items-center gap-2 pt-2">
                        <button
                          onClick={() => router.push(`/lead/${lead.id}`)}
                          className="p-2 text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                          title="Edit lead"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => openStory(lead.id)}
                          className="p-2 text-[var(--theme-accent)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                          title="View Story"
                        >
                          <BookOpenText size={18} />
                        </button>

                        <button
                          onClick={() => openComments(lead.id)}
                          className="p-2 text-[var(--theme-success)] hover:bg-[var(--theme-primary-softer)] rounded-lg transition"
                          title="Comments"
                        >
                          <MessageCircle size={16} />
                        </button>

                        <button
                          className="p-2 text-[var(--theme-danger)] hover:bg-[var(--theme-danger-soft)] rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Footer (results + pagination) */}
        {!loading && totalItems > 0 && (
          <div className="sticky bottom-0 z-20 bg-[var(--theme-card-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--theme-card-bg)]/80 border-t border-[var(--theme-border)]">
            <div className="px-3 sm:px-6 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {/* Results Summary */}
              <p className="text-xs sm:text-sm text-[var(--theme-text-muted)] text-center sm:text-left">
                Showing{" "}
                <span className="font-medium text-[var(--theme-text)]">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-[var(--theme-text)]">{totalItems}</span>{" "}
                leads
                {searchQuery && (
                  <span>
                    {" "}
                    matching "<span className="font-medium text-[var(--theme-primary)]">{searchQuery}</span>"
                  </span>
                )}
              </p>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-[var(--theme-border)] rounded bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {buildPageList(page, totalPages).map((p, idx) =>
                    p === "…" ? (
                      <span key={`gap-${idx}`} className="px-2 select-none">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 border rounded ${page === p
                          ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] border-[var(--theme-primary)]"
                          : "bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]"
                          }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-[var(--theme-border)] rounded bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {storyLeadId && (
        <StoryModal
          isOpen={isStoryModalOpen}
          onClose={() => setIsStoryModalOpen(false)}
          leadId={storyLeadId}
        />
      )}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        leadId={commentLeadId}
      />
    </div>
  );
};

export default LeadManage;
