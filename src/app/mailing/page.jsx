"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";

export default function InternalMailingForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [branches, setBranches] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState("")
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myBranchId, setMyBranchId] = useState("");

  // ---- Read role/branch from JWT cookie ----
  useEffect(() => {
    try {
      const token = Cookies.get("access_token");
      if (token) {
        const payload = jwtDecode(token);
        const roleKey =
          (payload?.role_name || payload?.role || "").toString().toUpperCase();
        const bId = payload?.branch_id ?? payload?.branchId ?? "";
        setIsSuperAdmin(roleKey === "SUPERADMIN");
        setMyBranchId(bId ? String(bId) : "");
        // Default-assign branch immediately for non-superadmins
        if (roleKey !== "SUPERADMIN" && bId) {
          setBranchId(String(bId));
        }
      }
    } catch (e) {
      console.warn("JWT decode failed:", e);
    }
  }, []);

  // ---- Fetch static dropdown data ----
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/branches/?skip=0&limit=100&active_only=false"
        );
        setBranches(data);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    const fetchProfiles = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/profile-role/?department_id=7&skip=0&limit=50&order_by=hierarchy_level"
        );
        setProfiles(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };

    fetchBranches();
    fetchProfiles();
  }, []);

  // ---- Auto-assign branch for non-superadmin when mode requires a branch ----
  useEffect(() => {
    if (!isSuperAdmin && myBranchId && (mode === "employees" || mode === "branches")) {
      setBranchId(myBranchId);
    }
  }, [mode, isSuperAdmin, myBranchId]);

  // ---- Load employees for selected branch (works for both SA & non-SA) ----
  useEffect(() => {
    if (mode === "employees" && branchId) {
      const fetchEmployees = async () => {
        try {
          const { data } = await axiosInstance.get(
            `/users/?skip=0&limit=100&active_only=false&branch_id=${branchId}`
          );
          setEmployees(data?.data || []);
        } catch (err) {
          console.error("Error fetching employees:", err);
        }
      };
      fetchEmployees();
    } else {
      setEmployees([]);
    }
  }, [branchId, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("mode", mode);

      if (mode === "employees" && employeeId) {
        formData.append("employee_ids", employeeId);
      }
      if (mode === "profiles" && profileId) {
        formData.append("profile_ids", profileId);
      }
      if (mode === "branches" && branchId) {
        formData.append("branch_ids", branchId);
      }
      if (file, files.length > 0) {
        formData.append("files", file);
      }

      const { data } = await axiosInstance.post("/internal-mailing/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResponse(data);
    } catch (err) {
      console.error("API Error:", err?.response?.data || err.message);
      setResponse({ error: true, message: err?.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const myBranchName = useMemo(() => {
    if (!branchId) return "";
    const found = branches.find((b) => String(b.id) === String(branchId));
    return found?.name || "";
  }, [branchId, branches]);

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6 sm:p-10">
    <div className="mx-auto max-w-4xl">
      {/* Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-200/50 backdrop-blur-sm">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100/80 p-8 sm:p-10">
            
          <div className="mb-6 flex items-center gap-4">
           
            <span className="text-lg font-bold text-slate-800">Recipient Settings</span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                Select Recipient Mode
              </label>
              <select
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                value={mode}
                onChange={(e) => {
                  const next = e.target.value;
                  setMode(next);
                  setProfileId("");
                  setEmployeeId("");
                  if (isSuperAdmin) setBranchId("");
                  setEmployees([]);
                }}
              >
                <option value="">-- Select Mode --</option>
                <option value="profiles">Profiles</option>
                <option value="employees">Employees</option>
                <option value="branches">Branches</option>
                {isSuperAdmin && <option value="all">All</option>}
              </select>
            </div>

            {/* Profiles */}
            {mode === "profiles" && (
              <div className="animate-fadeIn">
                <select
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                >
                  <option value="">-- Select Profile --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Branches */}
            {mode === "branches" && (
              <div className="animate-fadeIn">
                {isSuperAdmin ? (
                  <select
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-100/50">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                    Branch locked to <span className="font-bold">{myBranchName || "My Branch"}</span>
                  </div>
                )}
              </div>
            )}

            {/* Employees */}
            {mode === "employees" && (
              <div className="space-y-5 animate-fadeIn">
                {isSuperAdmin ? (
                  <select
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-100/50">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                    Branch locked to <span className="font-bold">{myBranchName || "My Branch"}</span>
                  </div>
                )}

                {branchId && (
                  <select
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {(emp.name || emp.full_name || emp.employee_name || "Employee")} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Compose Section */}
        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-8">
          <div className="mb-8 flex items-center gap-4">
           
            <span className="text-lg font-bold text-slate-800">Compose Message</span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-3 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                placeholder="Enter a compelling subject line..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-3 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="h-48 w-full resize-y rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-slate-800 shadow-lg shadow-slate-100 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:shadow-xl focus:shadow-blue-100/50 focus:ring-4 focus:ring-blue-100/50"
                placeholder="Compose your message here. Be clear, concise, and professional..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-slate-400" />
                </div>
                <span className="font-medium">Pro tip: Keep your message concise and include any necessary context or links</span>
              </div>
            </div>
          </div>

          {/* Attachment Section */}
          <div className="border-t border-slate-100 pt-8">
            <div className="mb-6 flex items-center gap-4">
             
              <span className="text-lg font-bold text-slate-800">Attachment</span>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200" />
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold text-slate-800 uppercase tracking-wide">
                Attach File <span className="text-slate-500 font-normal normal-case">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 text-slate-700 shadow-lg shadow-slate-100 outline-none transition-all duration-200 file:mr-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-slate-600 file:to-slate-700 file:px-6 file:py-3 file:text-sm file:font-bold file:text-white file:shadow-lg hover:border-slate-400 hover:bg-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="text-slate-400 text-sm font-medium opacity-75">
                    {/* This will be hidden when file input shows its content */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="border-t border-slate-100 pt-8 flex justify-center">
            <button
              type="submit"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 py-2 px-6 font-bold text-white shadow-2xl shadow-blue-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-300/60 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center gap-3 text-lg">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <span>Send Email</span>
                    <div className="w-5 h-7 transform transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </div>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Response Feedback */}
          {response && (
            <div
              className={`mt-6 rounded-2xl px-6 py-4 text-center font-bold shadow-lg transition-all duration-300 ${
                response.error
                  ? "border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-800 shadow-red-100/50"
                  : "border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 shadow-emerald-100/50"
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  response.error ? "bg-red-500" : "bg-emerald-500"
                }`}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-base">
                  {response.message || "Email sent successfully!"}
                </span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  </div>
);}