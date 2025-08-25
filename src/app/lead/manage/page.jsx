"use client";

import React, { useEffect, useState, useMemo } from "react";
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

const LeadManage = () => {
  const router = useRouter();

  // Data
  const [leadData, setLeadData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [responsesList, setResponsesList] = useState([]);

  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [responseFilter, setResponseFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All"); // 'All' | 'Completed' | 'Pending'

  // Employee autocomplete: selected code + text input
  const [employeeFilter, setEmployeeFilter] = useState("All"); // selected employee_code
  const [employeeQuery, setEmployeeQuery] = useState(""); // text shown in input
  const [showEmpDrop, setShowEmpDrop] = useState(false);

  // Accordion
  const [openLead, setOpenLead] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  // Story & Comments modals
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLeadId, setStoryLeadId] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentLeadId, setCommentLeadId] = useState(null);

  const [role, setRole] = useState(null);
  // after: const [role, setRole] = useState(null);
const ALLOWED_ROLES_FOR_CARDS = new Set([
  "SUPERADMIN",
  "BRANCH MANAGER",    // your app often uses this
  "BRANCH_MANAGER",    // safety if enum-style role shows up
]);
const canViewCards = ALLOWED_ROLES_FOR_CARDS.has(role);

  const [branchId, setBranchId] = useState(null);
  const isSuperAdmin = role === "SUPERADMIN";

  // Load dropdown lists
  useEffect(() => {
    const loadFilterLists = async () => {
      try {
        const [bRes, uRes, sRes, rRes] = await Promise.all([
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/lead-config/sources/?skip=0&limit=100"),
          axiosInstance.get("/lead-config/responses/?skip=0&limit=100"),
        ]);

        const allBranches = bRes.data || [];
        const allEmployees = uRes?.data?.data || [];

        if (isSuperAdmin) {
          setBranches(allBranches);
          setEmployees(allEmployees);
        } else {
          const safeBranchId = String(branchId || "");
          setBranches(allBranches.filter((b) => String(b.id) === safeBranchId));
          setEmployees(allEmployees.filter((e) => String(e.branch_id) === safeBranchId));
        }

        setSourcesList(sRes.data || []);
        setResponsesList(rRes.data || []);
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    };

    if (isSuperAdmin || branchId) loadFilterLists();
  }, [isSuperAdmin, branchId]);

  // Identify role/branch from cookies or token
  useEffect(() => {
    try {
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

  useEffect(() => {
    if (!isSuperAdmin && branchId) {
      setBranchFilter(String(branchId));
    }
  }, [isSuperAdmin, branchId]);

  // Load leads
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        const base = "/leads/?skip=0&limit=100&kyc_only=false";
        const url = !isSuperAdmin && branchId ? `${base}&branch_id=${branchId}` : base;
        const { data } = await axiosInstance.get(url);
        setLeadData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (isSuperAdmin || branchId) fetchLeadData();
  }, [isSuperAdmin, branchId]);

  // Name helpers
  const getSourceName = (id) =>
    sourcesList.find((s) => String(s.id) === String(id))?.name ||
    (id == null ? "—" : id);

  const getResponseName = (id) =>
    responsesList.find((r) => String(r.id) === String(id))?.name ||
    (id == null ? "—" : id);

  const getBranchName = (id) =>
    branches.find((b) => String(b.id) === String(id))?.name ||
    (id == null ? "—" : id);

  const getEmployeeName = (code) =>
    employees.find((e) => String(e.employee_code) === String(code))?.name ||
    (code == null ? "—" : code);

  // Select options (source/response only used)
  const sourceOptions = useMemo(
    () => [{ value: "All", label: "All Sources" }, ...sourcesList.map((s) => ({ value: String(s.id), label: s.name }))],
    [sourcesList]
  );
  const responseOptions = useMemo(
    () => [{ value: "All", label: "All Responses" }, ...responsesList.map((r) => ({ value: String(r.id), label: r.name }))],
    [responsesList]
  );

  // Filtered list
  const filteredLeads = useMemo(() => {
    let updated = [...leadData];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      updated = updated.filter((lead) => {
        const full_name = (lead.full_name || "").toLowerCase();
        const email = (lead.email || "").toLowerCase();
        const mobile = String(lead.mobile || "");
        const altMobile = String(lead.alternate_mobile || "");
        const pan = (lead.pan || "").toLowerCase();
        return (
          full_name.includes(q) ||
          email.includes(q) ||
          mobile.includes(q) ||
          altMobile.includes(q) ||
          pan.includes(q)
        );
      });
    }

    if (branchFilter !== "All") {
      updated = updated.filter((lead) => String(lead.branch_id) === String(branchFilter));
    }
    if (employeeFilter !== "All") {
      updated = updated.filter((lead) => String(lead.assigned_to_user) === String(employeeFilter));
    }
    if (sourceFilter !== "All") {
      updated = updated.filter((lead) => String(lead.lead_source_id) === String(sourceFilter));
    }
    if (responseFilter !== "All") {
      updated = updated.filter((lead) => String(lead.lead_response_id) === String(responseFilter));
    }
    if (kycFilter !== "All") {
      const wantCompleted = kycFilter === "Completed";
      updated = updated.filter((lead) => Boolean(lead.kyc) === wantCompleted);
    }

    return updated;
  }, [
    leadData,
    searchQuery,
    branchFilter,
    employeeFilter,
    sourceFilter,
    responseFilter,
    kycFilter,
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // Reset page & close any open accordion when filters/search change
  useEffect(() => {
    setCurrentPage(1);
    setOpenLead(null);
  }, [searchQuery, branchFilter, employeeFilter, sourceFilter, responseFilter, kycFilter]);

  // Close open lead when page changes
  useEffect(() => {
    setOpenLead(null);
  }, [currentPage]);

  const totalLeads = leadData.length;

  // Employee autocomplete behavior
  const empMatches = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return [];
    return employees
      .filter(
        (e) =>
          e?.name?.toLowerCase().includes(q) ||
          String(e.employee_code || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [employeeQuery, employees]);

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

  // Modals
  const openStory = (leadId) => {
    setStoryLeadId(leadId);
    setIsStoryModalOpen(true);
  };
  const openComments = (leadId) => {
    setCommentLeadId(leadId);
    setIsCommentModalOpen(true);
  };

  // Quick stats
useEffect(() => {
  if (!canViewCards) {
    // Hide cards for disallowed roles
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
      // If forbidden, just hide the cards without throwing/logging noisy errors
      if (error?.response?.status === 403) {
        if (!cancelled) setDashboardData(null);
        // no console.error / toast — stay silent
      } else {
        // Keep logs minimal & non-breaking for unexpected issues
        console.debug("Dashboard cards fetch skipped:", error?.message || error);
        if (!cancelled) setDashboardData(null);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, [canViewCards]);


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
    {/* Total Leads */}
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

    {/* Old Leads */}
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

    {/* New Leads */}
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

    {/* Clients */}
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
                    className={`px-4 py-2 rounded-lg border whitespace-nowrap ${
                      branchFilter === opt.value
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
                    if (employeeFilter !== "All") setEmployeeFilter("All");
                  }}
                  onFocus={() => setShowEmpDrop(Boolean(employeeQuery))}
                />
                {employeeFilter !== "All" || employeeQuery ? (
                  <button className="p-2 rounded hover:bg-gray-100" onClick={clearEmployee} title="Clear">
                    <X size={16} />
                  </button>
                ) : null}
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

                      {/* Right: Actions (always visible) */}
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
                      <div className="px-4 sm:px-6 pb-5 text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Pagination Controls */}
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
              className={`px-3 py-1 border rounded ${
                currentPage === i + 1
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

      {/* Story & Comments Modals */}
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
