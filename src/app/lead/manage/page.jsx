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
  // 1) cache first
  try {
    const cached = JSON.parse(localStorage.getItem("roleMap") || "{}");
    if (cached && typeof cached === "object" && Object.keys(cached).length) {
      return cached;
    }
  } catch {}

  // 2) API fallback (axiosInstance already carries auth)
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
  // prefer explicit names
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
  } catch {}

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

// human display ("BRANCH_MANAGER" → "BRANCH MANAGER")
const displayRole = (key) => (key === "BRANCH_MANAGER" ? "BRANCH MANAGER" : key || null);

// Hook that returns the canonical role key
function useRoleKey() {
  const [roleKey, setRoleKey] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // fast path: cookie set by login page, if you stored it
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
    return () => { alive = false; };
  }, []);

  return roleKey;
}

const LeadManage = () => {
  const router = useRouter();

  // Data
  const [leadData, setLeadData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
const [allSources, setAllSources] = useState([]);
  const [responsesList, setResponsesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [responseFilter, setResponseFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All");

  // Employee autocomplete
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // Accordion
  const [openLead, setOpenLead] = useState(null);

  // Cards
  const [dashboardData, setDashboardData] = useState(null);

  // Role / branch (use role_name!)
  const [role, setRole] = useState(null);          // normalized role_name
  const roleKey = useRoleKey();
  const [branchId, setBranchId] = useState(null);  // string
  const [ready, setReady] = useState(false);       // when role/branch is resolved
  const prevBranchRef = useRef(branchFilter);

  const isSuperAdmin = roleKey === "SUPERADMIN";
  const ALLOWED_ROLES_FOR_CARDS = new Set(["SUPERADMIN", "BRANCH MANAGER"]);
  const canViewCards = ALLOWED_ROLES_FOR_CARDS.has(roleKey);

  // Story & Comments modals
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLeadId, setStoryLeadId] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentLeadId, setCommentLeadId] = useState(null);

/* ---------- read role + branch once (uses dynamic roleKey) ---------- */
useEffect(() => {
  try {
    // branch from cookies/JWT (same as before)
    let b = null;
    const ui = Cookies.get("user_info");
    if (ui) {
      const parsed = JSON.parse(ui);
      b =
        parsed?.branch_id ??
        parsed?.user?.branch_id ??
        parsed?.branch?.id ??
        null;
    } else {
      const token = Cookies.get("access_token");
      if (token) {
        const payload = jwtDecode(token);
        b = payload?.branch_id ?? payload?.user?.branch_id ?? null;
      }
    }

    const bid = b ? String(b) : null;
    setBranchId(bid);

    // role -> store a display value if you show it in UI
    setRole(displayRole(roleKey));

    // lock branch filter for non-superadmins
    if (roleKey !== "SUPERADMIN" && bid) {
      setBranchFilter(String(bid)); // force string
    } else {
      setBranchFilter("All");
    }
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
      const [bRes, uRes, sRes, rRes] = await Promise.all([
        axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
        axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
        axiosInstance.get("/lead-config/sources/?skip=0&limit=100"),
        axiosInstance.get("/lead-config/responses/?skip=0&limit=100"),
      ]);

      const allBranches = bRes.data || [];
      const allEmps = uRes?.data?.data || [];
      const allSrc = Array.isArray(sRes.data) ? sRes.data : [];
const allResp = Array.isArray(rRes.data) ? rRes.data : [];
      setAllEmployees(allEmps)

      if (isSuperAdmin) {
        // SUPERADMIN: branches = all; employees scoped to selected branch (if any)
        setBranches(allBranches);
        const scopedEmployees =
          branchFilter !== "All"
            ? allEmployees.filter(e => String(e.branch_id) === String(branchFilter))
            : allEmps;
        if (!cancelled) setEmployees(scopedEmployees);
      } else {
        // Non-superadmin: lock to own branch
        const safeBranchId = String(branchId || "");
        setBranches(allBranches.filter(b => String(b.id) === safeBranchId));
        setEmployees(allEmps.filter(e => String(e.branch_id) === safeBranchId));
      }

      if (!cancelled) {
       setAllSources(allSrc);
  setResponsesList(allResp);
     }
    } catch (err) {
      console.error("Failed to load filters", err);
    }
  };

  loadFilterLists();
return () => { cancelled = true; };
}, [ready, isSuperAdmin, branchId, branchFilter]);

  /* ---------- load leads ---------- */
// ---------- load leads (server-side filtering) ----------
useEffect(() => {
  if (!ready) return;

  const fetchLeadData = async () => {
    try {
      setLoading(true);

      // Base params from API doc / your curl
      const params = {
        skip: 0,
        limit: 100,
        kyc_only: false,        // base default
        view: "all",
      };

      // Branch logic:
      // - Non-SA: always lock to own branch
      // - SA + specific tab: pass that branch_id
      // - SA + "All Branches": DON'T send branch_id (so we can search across branches)
      const selectedBranchId =
        !isSuperAdmin
          ? branchId
          : branchFilter !== "All"
            ? branchFilter
            : null;

      if (selectedBranchId) params.branch_id = selectedBranchId;

      // Employee filter
      if (employeeFilter !== "All") {
        params.assigned_to_user = String(employeeFilter).trim().toUpperCase();
        // IMPORTANT: when searching a user across all branches, do not force branch_id
        // (only omit if SA and the tab is "All")
        if (isSuperAdmin && branchFilter === "All" && params.branch_id) {
          delete params.branch_id;
        }
      }

      // Source / Response
      if (sourceFilter !== "All") params.lead_source_id = sourceFilter;
      if (responseFilter !== "All") params.response_id = responseFilter;

      // Global search (API param name is `search`)
      if (searchQuery.trim()) params.search = searchQuery.trim();

      // KYC: use Completed / Pending to set boolean; otherwise leave base kyc_only=false
      if (kycFilter === "Completed") {
        params.kyc_only = true;      // only leads with kyc=true
      } else if (kycFilter === "Pending") {
        // Some backends accept kyc=false; if yours does, uncomment next line.
        // params.kyc = false;
        // If not, keep kyc_only=false and rely on server’s default for "not completed".
        params.kyc_only = false;
      }

      const { data } = await axiosInstance.get("/leads/", { params });
      setLeadData(Array.isArray(data?.leads) ? data.leads : []);
    } catch (error) {
      console.error("Lead fetch failed:", error);
      setLeadData([]);
    } finally {
      setLoading(false);
    }
  };

  fetchLeadData();
  // Re-run whenever any server-side filter changes
}, [
  ready,
  isSuperAdmin,
  branchId,
  branchFilter,
  employeeFilter,
  sourceFilter,
  responseFilter,
  kycFilter,
  searchQuery,
]);

  /* ---------- quick cards (admins only) ---------- */
  useEffect(() => {
    if (!canViewCards) {
      setDashboardData(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosInstance.get(
          "/analytics/leads/admin/dashboard-card?days=30"
        );
        if (!cancelled) setDashboardData(data);
      } catch (error) {
        if (!cancelled) setDashboardData(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canViewCards]);

  /* ---------- name helpers ---------- */
const getSourceName = (id) =>
  (allSources.find((s) => String(s.id) === String(id))?.name) ||
  (id == null ? "—" : id);

  const getResponseName = (id) =>
    responsesList.find((r) => String(r.id) === String(id))?.name ||
    (id == null ? "—" : id);

  const getBranchName = (id) =>
    branches.find((b) => String(b.id) === String(id))?.name ||
    (id == null ? "—" : id);

  const getEmployeeName = (code) => {
    const c = String(code ?? "").trim();
    if (!c) return "—";
    return (allEmployees.find(e => String(e.employee_code).trim().toUpperCase() === c.toUpperCase())?.name)
|| c;
};

  /* ---------- options ---------- */
const sourcesScoped = useMemo(() => {
  const list = Array.isArray(allSources) ? allSources : [];

  // SUPERADMIN + "All Branches" → show ALL sources
  if (isSuperAdmin && branchFilter === "All") {
    // (optional) de-duplicate by name, then sort by name
    const seen = new Set();
    const dedup = [];
    for (const s of list) {
      const key = String(s?.name ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      dedup.push(s);
    }
    return dedup.sort((a, b) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" })
    );
  }

  // Non-SA (locked to own branch) OR SA with a specific branch tab
  const selectedBranchId = !isSuperAdmin
    ? branchId
    : (branchFilter !== "All" ? branchFilter : null);

  if (!selectedBranchId) return list; // safety fallback

  return list.filter(s => String(s.branch_id) === String(selectedBranchId));
}, [allSources, isSuperAdmin, branchId, branchFilter]);

const sourceOptions = useMemo(
  () => [
    { value: "All", label: "All Sources" },
    ...((sourcesScoped || []).map(s => ({ value: String(s.id), label: s.name })))
  ],
  [sourcesScoped]
);

  const responseOptions = useMemo(
    () => [{ value: "All", label: "All Responses" }, ...responsesList.map((r) => ({ value: String(r.id), label: r.name }))],
    [responsesList]
  );

  /* ---------- filtering ---------- */
// ---------- filtering (server already did it) ----------
const filteredLeads = useMemo(() => leadData, [leadData]);

  /* ---------- pagination ---------- */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage]);

// Only reset paging when any filter changes
 useEffect(() => {
   setCurrentPage(1);
   setOpenLead(null);
 }, [searchQuery, branchFilter, employeeFilter, sourceFilter, responseFilter, kycFilter]);

// Clear employee selection ONLY when the branch tab actually changes
useEffect(() => {
  if (prevBranchRef.current !== branchFilter) {
    setEmployeeFilter("All");
    setEmployeeQuery("");
    setShowEmpDrop(false);
    setSourceFilter("All");
    prevBranchRef.current = branchFilter;
  }
}, [branchFilter]);

  useEffect(() => {
    setOpenLead(null);
  }, [currentPage]);

  const totalLeads = leadData.length;

  /* ---------- employee autocomplete ---------- */
  const empMatches = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return [];
    const pool = isSuperAdmin && branchFilter === "All" ? allEmployees : employees;
    return pool
      .filter(
        (e) =>
          e?.name?.toLowerCase().includes(q) ||
          String(e.employee_code || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [employeeQuery, employees, allEmployees, isSuperAdmin, branchFilter]);

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

  /* ---------- modals ---------- */
  const openStory = (leadId) => {
    setStoryLeadId(leadId);
    setIsStoryModalOpen(true);
  };
  const openComments = (leadId) => {
    setCommentLeadId(leadId);
    setIsCommentModalOpen(true);
  };

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Activity size={16} />
              Manage and track your leads efficiently
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
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
      {canViewCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData?.overall?.total_leads ?? "--"}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={12} /> Active pipeline
                </p>
              </div>
              <div className="bg-blue-50 rounded-full p-3 group-hover:bg-blue-100 transition-colors">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Old Leads</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData?.overall?.old_leads ?? "--"}
                </p>
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Clock size={12} /> Existing pipeline
                </p>
              </div>
              <div className="bg-amber-50 rounded-full p-3 group-hover:bg-amber-100 transition-colors">
                <Clock size={24} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">New Leads</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData?.overall?.new_leads ?? "--"}
                </p>
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Recently added
                </p>
              </div>
              <div className="bg-emerald-50 rounded-full p-3 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Clients</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dashboardData?.overall?.total_clients ?? "--"}
                </p>
                <p className="text-xs text-purple-600 flex items-center gap-1">
                  <Database size={12} /> Converted leads
                </p>
              </div>
              <div className="bg-purple-50 rounded-full p-3 group-hover:bg-purple-100 transition-colors">
                <Database size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-100">
        <div className="flex flex-col gap-4">
          {/* Branch Tabs → visible only to SUPERADMIN */}
          {isSuperAdmin && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[{ value: "All", label: "All Branches" }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))].map(
                (opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBranchFilter(opt.value)}
                    className={`px-4 py-2 rounded-lg border whitespace-nowrap ${branchFilter === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                      }`}
                  >
                    {opt.label}
                  </button>
                )
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-2 border rounded-lg"
                  value={employeeQuery}
                  onChange={(e) => {
                    setEmployeeQuery(e.target.value);
                    setShowEmpDrop(true);
                    // Only clear a previously selected employee if the user edits the text
   if (employeeFilter !== "All") setEmployeeFilter("All");
                  }}
                  onFocus={() => setShowEmpDrop(Boolean(employeeQuery))}
                  onKeyDown={(e) => {
   if (e.key === "Enter") e.preventDefault();
 }}
                />
                {(employeeFilter !== "All" || employeeQuery) && (
                  <button className="p-2 rounded hover:bg-gray-100" onClick={clearEmployee} title="Clear">
                    <X size={16} />
                  </button>
                )}
              </div>

              {showEmpDrop && empMatches.length > 0 && (
                <div
                  className="absolute top-full left-0 w-full bg-white border rounded-lg shadow max-h-56 overflow-y-auto z-10"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {empMatches.map((emp) => (
                    <div
                      key={emp.employee_code}
                      onClick={() => handleEmployeeSelect(emp)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-gray-500">
                        Code: {emp.employee_code}
                        {emp.branch_id ? ` • ${getBranchName(emp.branch_id)}` : ""}
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
              className="px-4 py-3 border rounded-lg"
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
              className="px-4 py-3 border rounded-lg"
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
              className="px-4 py-3 border rounded-lg"
            >
              {responseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Accordion List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mt-8">
          {loading ? (
            <LoadingState message="Loading leads..." />
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="bg-gray-50 rounded-full p-6 mb-4">
                <Users size={48} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium mb-2">No leads found</p>
              <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedLeads.map((lead) => {
                const isOpen = openLead === lead.id;
                return (
                  <div key={lead.id} className="bg-white">
                    <div className="w-full flex justify-between items-center px-4 sm:px-6 py-4 hover:bg-gray-50 transition">
                      {/* Left: Lead summary */}
                      <button
                        onClick={() => setOpenLead(isOpen ? null : lead.id)}
                        className="text-left flex-1"
                      >
                        <div className="font-semibold text-gray-900">
                          {lead.full_name || "—"}{" "}
                          <span className="text-xs text-gray-500">#{lead.id}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {lead.mobile || "—"} • {getResponseName(lead.lead_response_id)} •{" "}
                          {getSourceName(lead.lead_source_id)}
                        </div>
                      </button>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/lead/${lead.id}`)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Edit lead"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => openStory(lead.id)}
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition"
                          title="View Story"
                        >
                          <BookOpenText size={18} />
                        </button>

                        <button
                          onClick={() => openComments(lead.id)}
                          className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition"
                          title="Comments"
                        >
                          <MessageCircle size={16} />
                        </button>

                        <button
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="px-4 sm:px-6 pb-5 text-sm text-gray-700 grid grid-cols-1 md/grid-cols-2 lg:grid-cols-3 gap-3">
                        <div><span className="font-medium">Email:</span> {lead.email || "—"}</div>
                        <div><span className="font-medium">PAN:</span> {lead.pan || "—"}</div>
                        <div><span className="font-medium">Branch:</span> {getBranchName(lead.branch_id)}</div>
                        <div><span className="font-medium">Assigned To:</span> {getEmployeeName(lead.assigned_to_user)}</div>
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
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="Edit lead"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => openStory(lead.id)}
                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition"
                            title="View Story"
                          >
                            <BookOpenText size={18} />
                          </button>

                          <button
                            onClick={() => openComments(lead.id)}
                            className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition"
                            title="Comments"
                          >
                            <MessageCircle size={16} />
                          </button>

                          <button
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {!loading && filteredLeads.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600 text-center">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {(currentPage - 1) * pageSize + 1}
              {"–"}
              {Math.min(currentPage * pageSize, filteredLeads.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-900">{filteredLeads.length}</span>{" "}
            filtered leads (out of {totalLeads} total)
            {searchQuery && (
              <span>
                {" "}
                matching "<span className="font-medium text-blue-600">{searchQuery}</span>"
              </span>
            )}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${currentPage === i + 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

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