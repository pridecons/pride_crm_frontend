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

  // JWT & Initial Setup
  useEffect(() => {
    try {
      const token = Cookies.get("access_token");
      if (token) {
        const payload = jwtDecode(token);
        const roleKey = (payload?.role_name || payload?.role || "").toString().toUpperCase();
        const bId = payload?.branch_id ?? payload?.branchId ?? "";
        setIsSuperAdmin(roleKey === "SUPERADMIN");
        setMyBranchId(bId ? String(bId) : "");
        if (roleKey !== "SUPERADMIN" && bId) setBranchId(String(bId));
      }
    } catch (e) {
      console.warn("JWT decode failed:", e);
    }
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await axiosInstance.get("/branches/?skip=0&limit=100&active_only=false");
        setBranches(data);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    const fetchProfiles = async () => {
      try {
        const { data } = await axiosInstance.get("/profile-role/?department_id=7&skip=0&limit=50&order_by=hierarchy_level");
        setProfiles(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };

    fetchBranches();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (!isSuperAdmin && myBranchId && (mode === "employees" || mode === "branches")) {
      setBranchId(myBranchId);
    }
  }, [mode, isSuperAdmin, myBranchId]);

  useEffect(() => {
    if (mode === "employees" && branchId) {
      const fetchEmployees = async () => {
        try {
          const { data } = await axiosInstance.get(`/users/?skip=0&limit=100&active_only=false&branch_id=${branchId}`);
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

      if (mode === "employees" && employeeId) formData.append("employee_ids", employeeId);
      if (mode === "profiles" && profileId) formData.append("profile_ids", profileId);
      if (mode === "branches" && branchId) formData.append("branch_ids", branchId);
      if (file, files.length > 0) formData.append("files", file);

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

  const myBranchName = useMemo(() => {
    if (!branchId) return "";
    const found = branches.find((b) => String(b.id) === String(branchId));
    return found?.name || "";
  }, [branchId, branches]);

  // Gmail-style recipient display
  const getRecipientDisplay = () => {
    if (mode === "all") return "All Users";
    if (mode === "profiles" && profileId) {
      const profile = profiles.find(p => p.id == profileId);
      return profile?.name || "";
    }
    if (mode === "employees" && employeeId) {
      const emp = employees.find(e => e.employee_code == employeeId);
      return emp ? `${emp.name || emp.full_name || "Employee"} (${emp.employee_code})` : "";
    }
    if (mode === "branches" && branchId) return myBranchName;
    return "";
  };

  return (
    <div className=" bg-gray-50">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Compose Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* Compose Header */}
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 rounded-t-lg">
            <h2 className="text-sm font-medium text-gray-700">Internal Mail</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Recipients Section */}
            <div className="border-b border-gray-200">
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-gray-600 mt-2 w-12">To:</span>
                  <div className="flex-1">
                    {!mode ? (
                      <select
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        <option value="">Select recipient type...</option>
                        <option value="profiles">Profiles</option>
                        <option value="employees">Employees</option>
                        <option value="branches">Branches</option>
                        {isSuperAdmin && <option value="all">All Users</option>}
                      </select>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {getRecipientDisplay() && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {getRecipientDisplay()}
                            <button
                              type="button"
                              onClick={() => {
                                setMode("");
                                setProfileId("");
                                setEmployeeId("");
                                if (isSuperAdmin) setBranchId("");
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        )}
                        
                        {/* Mode-specific selectors */}
                        {mode === "profiles" && !profileId && (
                          <select
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={profileId}
                            onChange={(e) => setProfileId(e.target.value)}
                          >
                            <option value="">Select profile...</option>
                            {profiles.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        )}

                        {mode === "branches" && !branchId && isSuperAdmin && (
                          <select
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                          >
                            <option value="">Select branch...</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        )}

                        {mode === "branches" && !isSuperAdmin && (
                          <span className="text-sm text-gray-600">
                            (Auto-selected: {myBranchName})
                          </span>
                        )}

                        {mode === "employees" && (
                          <>
                            {isSuperAdmin && !branchId && (
                              <select
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                              >
                                <option value="">Select branch first...</option>
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            )}
                            
                            {branchId && !employeeId && (
                              <select
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                              >
                                <option value="">Select employee...</option>
                                {employees.map((emp) => (
                                  <option key={emp.employee_code} value={emp.employee_code}>
                                    {emp.name || emp.full_name || "Employee"} ({emp.employee_code})
                                  </option>
                                ))}
                              </select>
                            )}

                            {!isSuperAdmin && branchId && (
                              <span className="text-xs text-gray-500">(Branch: {myBranchName})</span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div className="px-4 py-2 flex items-center gap-3 border-t border-gray-200">
                <span className="text-sm text-gray-600 w-12">Subject:</span>
                <input
                  className="flex-1 text-sm outline-none"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Message Body */}
            <div className="px-4 py-3">
              <textarea
                className="w-full min-h-[300px] text-sm outline-none resize-none"
                placeholder="Compose email"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>

            {/* Bottom Toolbar */}
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Sending...
                    </>
                  ) : (
                    <>Send</>
                  )}
                </button>

                <label className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  />
                  {file ? <span className="text-sm">{file.name}</span> : <span className="text-sm">Attach</span>}
                </label>
              </div>

              <button
                type="button"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                onClick={() => window.location.reload()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Response Message */}
        {response && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            response.error 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {response.message || "Email sent successfully!"}
          </div>
        )}
      </div>
    </div>
  );
}