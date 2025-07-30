"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { useRouter } from "next/navigation";
import {
  Plus,
  Database,
  Filter,
  Settings,
  Users,
  CheckCircle,
  Clock,
  Search,
  Edit3,
  Trash2,
  TrendingUp,
  Activity,
} from "lucide-react";
import SourceModel from "@/components/Lead/Source";
import ResponseModel from "@/components/Lead/Response";
import FetchLimitModel from "@/components/Lead/FetchLimit";

const LeadManage = () => {
  const router = useRouter();
  const [leadData, setLeadData] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isOpenSource, setIsOpenSource] = useState(false);
  const [isOpenResponse, setIsOpenResponse] = useState(false);
  const [isOpenFetchLimit, setIsOpenFetchLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [responseFilter, setResponseFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  // at the top of your component, alongside your other useState’s:
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);
  const [responsesList, setResponsesList] = useState([]);

  // then, in a new useEffect, fetch them once on mount:
  useEffect(() => {
    const loadFilterLists = async () => {
      try {
        const [bRes, uRes, sRes, rRes] = await Promise.all([
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/users/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/lead-config/sources/?skip=0&limit=100"),
          axiosInstance.get("/lead-config/responses/?skip=0&limit=100"),
        ]);
        setBranches(bRes.data);             // array of {id, name, …}
        setEmployees(uRes.data.data);       // user list nested under .data
        setSourcesList(sRes.data);          // array of {id, name, …}
        setResponsesList(rRes.data);        // array of {id, name, …}
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    };
    loadFilterLists();
  }, []);


  // once leadData is loaded, build your dropdown options:
  const branchOptions = [
    { value: "All", label: "All Branches" },
    ...branches.map(b => ({ value: b.id.toString(), label: b.name }))
  ];
  const employeeOptions = ["All", ...employees.map(e => ({ value: e.employee_code, label: e.name }))];
  const sourceOptions = ["All", ...sourcesList.map(s => ({ value: s.name, label: s.name }))];
  const responseOptions = ["All", ...responsesList.map(r => ({ value: r.name, label: r.name }))];


  useEffect(() => {
    fetchLeadData();
  }, []);

  const fetchLeadData = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/leads/?skip=0&limit=100&kyc_only=false"
      );
      setLeadData(data);
      setFilteredLeads(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads when search or filter changes
  useEffect(() => {
    let updated = [...leadData];

    // … your search + status logic …

    if (branchFilter !== "All") {
      updated = updated.filter(lead => lead.branch_id?.toString() === branchFilter);
    }
    if (employeeFilter !== "All") {
      updated = updated.filter(lead => lead.employee_code === employeeFilter);
    }
    if (sourceFilter !== "All") {
      updated = updated.filter(lead => lead.source === sourceFilter);
    }
    if (responseFilter !== "All") {
      updated = updated.filter(lead => lead.response === responseFilter);
    }

    setFilteredLeads(updated);
  }, [
    leadData,
    searchQuery,
    statusFilter,
    branchFilter,     // ← add here
    employeeFilter,   // ← and here
    sourceFilter,     // ← and here
    responseFilter,   // ← and here
  ]);

  const columns = leadData.length > 0 ? Object.keys(leadData[0]) : [];

  // Quick Stats
  const totalLeads = leadData.length;
  const pendingLeads = leadData.filter((lead) => lead.status === "Pending").length;
  const completedLeads = leadData.filter((lead) => lead.status === "Completed").length;
  const sourcesCount = new Set(leadData.map((lead) => lead.source)).size;

  const getStatusBadge = (status) => {
    const statusStyles = {
      Pending: "bg-amber-100 text-amber-800 border-amber-200",
      Completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Processing: "bg-blue-100 text-blue-800 border-blue-200",
      Failed: "bg-red-100 text-red-800 border-red-200",
    };

    return statusStyles[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Lead Management
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Activity size={16} />
              Manage and track your leads efficiently
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Leads
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp size={12} />
                Active pipeline
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
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Pending
              </p>
              <p className="text-3xl font-bold text-gray-900">{pendingLeads}</p>
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Clock size={12} />
                Awaiting action
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
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Completed
              </p>
              <p className="text-3xl font-bold text-gray-900">{completedLeads}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle size={12} />
                Successfully processed
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
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Sources
              </p>
              <p className="text-3xl font-bold text-gray-900">{sourcesCount}</p>
              <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                <Database size={12} />
                Active channels
              </p>
            </div>
            <div className="bg-purple-50 rounded-full p-3 group-hover:bg-purple-100 transition-colors">
              <Database size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => router.push("/lead/add")}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 rounded-full p-4 mb-4 group-hover:bg-blue-100 transition-colors">
              <Plus size={28} className="text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Add Lead</p>
            <p className="text-sm text-gray-500">Create new lead entry</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenSource(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-emerald-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-emerald-50 rounded-full p-4 mb-4 group-hover:bg-emerald-100 transition-colors">
              <Database size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Source</p>
            <p className="text-sm text-gray-500">Manage lead sources</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenResponse(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-amber-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-amber-50 rounded-full p-4 mb-4 group-hover:bg-amber-100 transition-colors">
              <Filter size={28} className="text-amber-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Response</p>
            <p className="text-sm text-gray-500">Configure responses</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenFetchLimit(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-purple-50 rounded-full p-4 mb-4 group-hover:bg-purple-100 transition-colors">
              <Settings size={28} className="text-purple-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Fetch Limit</p>
            <p className="text-sm text-gray-500">Set data limits</p>
          </div>
        </div>
        <div
          onClick={() => setIsBulkUploadOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-red-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-red-50 rounded-full p-4 mb-4 group-hover:bg-red-100 transition-colors">
              <Database size={28} className="text-red-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Bulk Upload</p>
            <p className="text-sm text-gray-500">Upload leads from CSV</p>
          </div>
        </div>
      </div>

      {/* Enhanced Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status */}
            <select
              className="px-4 py-3"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Branch */}

            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="px-4 py-3 ">
              {branchOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}

            </select>

            {/* Employee */}
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="px-4 py-3 "
            >
              {employeeOptions.map(opt =>
                <option key={opt === "All" ? "All" : opt.value}
                  value={opt === "All" ? "All" : opt.value}>
                  {opt === "All" ? "All Employees" : opt.label}
                </option>
              )}
            </select>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="px-4 py-3 "
            >
              {sourceOptions.map(opt =>
                <option key={opt === "All" ? "All" : opt.value}
                  value={opt === "All" ? "All" : opt.value}>
                  {opt === "All" ? "All Sources" : opt.label}
                </option>
              )}
            </select>

            {/* Response */}
            <select
              value={responseFilter}
              onChange={e => setResponseFilter(e.target.value)}
              className="px-4 py-3 "
            >
              {responseOptions.map(opt =>
                <option key={opt === "All" ? "All" : opt.value}
                  value={opt === "All" ? "All" : opt.value}>
                  {opt === "All" ? "All Responses" : opt.label}
                </option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="bg-gray-50 rounded-full p-6 mb-4">
              <Users size={48} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium mb-2">No leads found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    {columns.map((col) => {
                      let value = lead[col];
                      if (value && typeof value === "object") {
                        value = JSON.stringify(value);
                      }

                      return (
                        <td
                          key={col}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {col === 'status' && value ? (
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(value)}`}>
                              {value}
                            </span>
                          ) : (
                            <span className={value == null ? "text-gray-400" : ""}>
                              {value == null ? "—" : value}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200">
                          <Edit3 size={16} />
                        </button>
                        <button className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {!loading && filteredLeads.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-600 text-center">
            Showing <span className="font-medium text-gray-900">{filteredLeads.length}</span> of{" "}
            <span className="font-medium text-gray-900">{totalLeads}</span> leads
            {searchQuery && (
              <span> matching "<span className="font-medium text-blue-600">{searchQuery}</span>"</span>
            )}
          </p>
        </div>
      )}

      {/* Modals */}
      <SourceModel open={isOpenSource} setOpen={setIsOpenSource} />
      <ResponseModel open={isOpenResponse} setOpen={setIsOpenResponse} />
      <FetchLimitModel open={isOpenFetchLimit} setOpen={setIsOpenFetchLimit} />
      {isBulkUploadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Bulk Lead Upload</h2>
              <button onClick={() => setIsBulkUploadOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {/* Upload Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                try {
                  setUploading(true);
                  const { data } = await axiosInstance.post("/bulk-leads/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  setUploadResult(data);
                } catch (error) {
                  console.error("Upload failed", error);
                  alert("Failed to upload CSV");
                } finally {
                  setUploading(false);
                }
              }}
              className="space-y-4"
            >
              <input type="file" name="csv_file" accept=".csv" required className="w-full border p-2 rounded" />

              {/* Mapping Fields */}
              <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name Column</label>
                  <input type="number" name="name_column"  required className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Column</label>
                  <input type="number" name="mobile_column"  required className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Column</label>
                  <input type="number" name="email_column"  required className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Column</label>
                  <input type="number" name="address_column"  className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City Column</label>
                  <input type="number" name="city_column"  className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment Column</label>
                  <input type="number" name="segment_column"  className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation Column</label>
                  <input type="number" name="occupation_column" className="border p-2 rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment Column</label>
                  <input type="number" name="investment_column" className="border p-2 rounded w-full" />
                </div>
              </div>
              {/* Upload Result */}
            {uploadResult && (
              <div className="mt-4 p-3 border rounded bg-gray-50">
                <p>Total Rows: {uploadResult.total_rows}</p>
                <p>Successful Uploads: {uploadResult.successful_uploads}</p>
                <p>Duplicates Skipped: {uploadResult.duplicates_skipped}</p>
                <p className="text-red-600 mt-2">Errors: {uploadResult.errors.length}</p>
              </div>
            )}
            </div>


              <select name="branch_id" required className="border p-2 rounded w-full">
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <input type="text" name="lead_source_id" defaultValue="1" className="border p-2 rounded w-full" placeholder="Lead Source ID" />
              <input type="text" name="employee_code" defaultValue="" className="border p-2 rounded w-full" placeholder="Employee Code" />

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                {uploading ? "Uploading..." : "Upload CSV"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadManage;