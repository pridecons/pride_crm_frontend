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
import { usePermissions } from "@/context/PermissionsContext";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";

const LeadManage = () => {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // Data
  const [leadData, setLeadData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [responsesList, setResponsesList] = useState([]);
  // Date 
  const [data, setData] = useState({
    source_analytics: [],
    response_analytics: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [sources, setSources] = useState([]);


  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [responseFilter, setResponseFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All"); // NEW: 'All' | 'Completed' | 'Pending'

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
        setBranches(bRes.data || []);
        setEmployees(uRes?.data?.data || []);
        setSourcesList(sRes.data || []);
        setResponsesList(rRes.data || []);
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    };
    loadFilterLists();
  }, []);

  // Load leads
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/leads/?skip=0&limit=100&kyc_only=false"
        );
        setLeadData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeadData();
  }, []);

  // Helpers to display names
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

  // Options
  const branchOptions = useMemo(
    () => [{ value: "All", label: "All Branches" }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))],
    [branches]
  );
  const sourceOptions = useMemo(
    () => [{ value: "All", label: "All Sources" }, ...sourcesList.map((s) => ({ value: String(s.id), label: s.name }))],
    [sourcesList]
  );
  const responseOptions = useMemo(
    () => [{ value: "All", label: "All Responses" }, ...responsesList.map((r) => ({ value: String(r.id), label: r.name }))],
    [responsesList]
  );

  // Filtering (must come BEFORE pagination that uses it)
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
      updated = updated.filter(
        (lead) => String(lead.branch_id) === String(branchFilter)
      );
    }
    if (employeeFilter !== "All") {
      updated = updated.filter(
        (lead) => String(lead.assigned_to_user) === String(employeeFilter)
      );
    }
    if (sourceFilter !== "All") {
      updated = updated.filter(
        (lead) => String(lead.lead_source_id) === String(sourceFilter)
      );
    }
    if (responseFilter !== "All") {
      updated = updated.filter(
        (lead) => String(lead.lead_response_id) === String(responseFilter)
      );
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

  // Quick Stats
  const totalLeads = leadData.length;
  const pendingLeads = leadData.filter((lead) => lead.status === "Pending").length;
  const completedLeads = leadData.filter((lead) => lead.status === "Completed").length;
  const sourcesCount = new Set(
    leadData.map((lead) => lead.lead_source_id).filter((v) => v != null)
  ).size;

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

  // Openers
  const openStory = (leadId) => {
    setStoryLeadId(leadId);
    setIsStoryModalOpen(true);
  };
  const openComments = (leadId) => {
    setCommentLeadId(leadId);
    setIsCommentModalOpen(true);
  };


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/analytics/leads/admin/dashboard-card?days=30"
        );
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };

    fetchDashboardData();
  }, []);


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

        {/* Total Clients */}
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


      <DashboardTables />


      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-100">
        <div className="flex flex-col gap-4">
          {/* Branch Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {branchOptions.map((opt) => (
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
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
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
                  <button
                    className="p-2 rounded hover:bg-gray-100"
                    onClick={clearEmployee}
                    title="Clear"
                  >
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
      </div>

      {/* Accordion List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
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


function DashboardTables() {
  const [data, setData] = useState({
    source_analytics: [],
    response_analytics: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [sources, setSources] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);

  // fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(
          `/analytics/leads/admin/dashboard?days=30`
        );
        setData(response.data);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // fetch sources for dropdown
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await axiosInstance.get(
          "/lead-config/sources/?skip=0&limit=100",
          { headers: { accept: "application/json" } }
        );
        setSources(res.data);
      } catch (err) {
        console.error("Error fetching sources:", err);
      }
    };
    fetchSources();
  }, []);
  const fetchFilteredData = async () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/analytics/leads/admin/dashboard?from=${fromDate}&to=${toDate}`
      );
      setData(response.data);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setApplied(false);
  };

  const handleApply = () => {
    console.log("Applying filter with:", fromDate, toDate);
    // your API call or filter logic here
    setApplied(true); // after applying, show Clear
  };


  return (

    <div className="w-full grid grid-cols-3 gap-8 pb-6">
      {/* Lead Source Performance Table */}
      {data.source_analytics?.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg w-full border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              Lead Source
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pending Leads
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.source_analytics.map((source, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {source.source_name}
                    </td>
                    <td className="px-6 py-4 text-orange-700">
                      {source.total_leads - source.converted_leads}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Response Distribution Table */}
      <div className="col-span-2  bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Response Distribution
          </h2>
          <p className="text-gray-600 text-sm mt-1">How leads have responded</p>
        </div>

        {/* Filter */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by Source:
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none min-w-[150px]"
            >
              <option value="">All Sources</option>
              {sources.map((src, idx) => (
                <option key={idx} value={src.name || src.source_name}>
                  {src.name || src.source_name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              {/* From Date */}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setApplied(false); // reset apply state if user changes date
                }}
                className="border rounded px-2 py-1 text-sm"
              />

              {/* To Date */}
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setApplied(false);
                }}
                className="border rounded px-2 py-1 text-sm"
              />

              {/* Button Logic */}
              {applied ? (
                // After Apply → always show Clear
                <button
                  onClick={handleClear}
                  className="px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                >
                  Clear
                </button>
              ) : fromDate || toDate ? (
                fromDate && toDate ? (
                  <button
                    onClick={handleApply}
                    className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                  >
                    Apply
                  </button>
                ) : (
                  <button
                    onClick={handleClear}
                    className="px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                  >
                    Clear
                  </button>
                )
              ) : null}
            </div>

          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Percentage
                </th>
              </tr>
            </thead>
          </table>
          {/* Scrollable tbody */}
          <div className="max-h-[250px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <tbody className="bg-white divide-y divide-gray-200">
                {data.response_analytics
                  .filter((res) =>
                    selectedSource ? res.response_source === selectedSource : true
                  )
                  .map((res, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {res.response_name}
                      </td>
                      <td className="px-6 py-4 text-blue-700">{res.total_leads}</td>
                      <td className="px-6 py-4 text-gray-900">{res.percentage}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>

  );
}


