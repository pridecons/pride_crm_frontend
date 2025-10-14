import { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "../LoadingState";
import { UsersDropdown, LeadSourceDropdown } from "./DropdownUser";

const Loader =
  LoadingState ??
  (({ message }) => (
    <div className="p-6 text-gray-500">{message || "Loading..."}</div>
  ));

function ResponseDistribution({ isSuperAdmin }) {
  const [respLoading, setRespLoading] = useState(true);
  const [respError, setRespError] = useState(null);
  const [responseTotal, setResponseTotal] = useState(0);
  const [responseRows, setResponseRows] = useState([]);

  const [employeeRole, setEmployeeRole] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState(false);

  const [roles, setRoles] = useState([]);

  // ——— Employees search (kept as-is; works alongside UsersDropdown) ———
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [empMatches, setEmpMatches] = useState([]);


  // // Roles
  // const fetchRoles = async () => {
  //   try {
  //     const res = await axiosInstance.get("/roles");
  //     setRoles(res.data?.data || res.data || []);
  //   } catch (err) {
  //     console.error("Failed to fetch roles:", err);
  //   }
  // };


  // Search employees
  const searchEmployees = async (query) => {
    if (!query.trim()) {
      setEmpMatches([]);
      return;
    }
    try {
      const res = await axiosInstance.get("/employees/search", {
        params: { q: query, limit: 10 },
      });
      setEmpMatches(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to search employees:", err);
      setEmpMatches([]);
    }
  };

  const handleEmployeePick = (emp) => {
    const code = emp.employee_code || emp.code || emp.id || "";
    setSelectedUserId(code); // ✅ API: user_id = employee_code
    setEmployeeQuery(emp.name || `Employee ${code}`);
    setShowEmpDrop(false);
  };

  const clearEmployee = () => {
    setSelectedUserId("");
    setEmployeeQuery("");
    setShowEmpDrop(false);
  };

  // Date filter handlers
  const handleApplyDates = () => {
    if (fromDate && toDate) {
      setApplied(true);
      fetchResponseDistribution(true);
    }
  };

  const handleClearDates = () => {
    setFromDate("");
    setToDate("");
    setApplied(false);
  };

  // Fetch response distribution data
  const fetchResponseDistribution = async (triggeredByDates = false) => {
    try {
      setRespLoading(true);
      setRespError("");

      const params = {
        view: "all", // ✅ matches API
      };

      // If no date range applied, use days=30 as default
      if (!(fromDate && toDate && (applied || triggeredByDates))) {
        params.days = 30;
      } else {
        params.from_date = fromDate; // YYYY-MM-DD
        params.to_date = toDate;     // YYYY-MM-DD
      }

      if (employeeRole) params.employee_role = employeeRole;       // ✅ API: employee_role (id or name)
      if (selectedSourceId) params.source_id = selectedSourceId;   // ✅ API: source_id
      if (selectedUserId) params.user_id = selectedUserId;         // ✅ API: user_id (employee_code)

      const res = await axiosInstance.get(
        "/analytics/leads/admin/response-analytics",
        { params }
      );

      const breakdown = res.data?.breakdown || [];
      const total = res.data?.total_leads || 0;

      setResponseRows(breakdown);
      setResponseTotal(total);
    } catch (err) {
      console.error("API Error:", err);
      setRespError(err.response?.data?.message || "Failed to load data");
    } finally {
      setRespLoading(false);
    }
  };

  // Debounced employee search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (employeeQuery && showEmpDrop) {
        searchEmployees(employeeQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeQuery, showEmpDrop]);


  // Re-fetch on filter changes
  useEffect(() => {
    fetchResponseDistribution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRole, selectedSourceId, selectedUserId, applied]);

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Response Distribution</h2>
        <p className="text-gray-600 text-sm mt-1">Breakdown of lead responses</p>
      </div>
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 flex-wrap gap-3">
        {/* Filters Row */}
        <div className=" bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {/* ✅ Controlled UsersDropdown → sets user_id (employee_code) */}
          <UsersDropdown
            value={selectedUserId}
            onChange={(code) => setSelectedUserId(code || "")}
          />

          {/* ✅ Controlled LeadSourceDropdown → sets source_id */}
          <LeadSourceDropdown
            value={selectedSourceId}
            onChange={(id) => setSelectedSourceId(id || "")}
          />

          {/* Employee search (kept) */}


          {/* Dates */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setApplied(false);
              }}
              className="border rounded px-2 py-2 text-sm border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="From (YYYY-MM-DD)"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setApplied(false);
              }}
              className="border rounded px-2 py-2 text-sm  border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              title="To (YYYY-MM-DD)"
            />
            {applied ? (
              <button
                onClick={handleClearDates}
                className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
              >
                Clear
              </button>
            ) : fromDate || toDate ? (
              fromDate && toDate ? (
                <button
                  onClick={handleApplyDates}
                  className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Apply
                </button>
              ) : (
                <button
                  onClick={handleClearDates}
                  className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
                >
                  Clear
                </button>
              )
            ) : null}
          </div></div>
        <div>
          <div className="relative w-full pt-4 sm:w-64">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search Employee..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={employeeQuery}
                onChange={(e) => {
                  setEmployeeQuery(e.target.value);
                  setShowEmpDrop(true);
                  if (!e.target.value) setSelectedUserId("");
                }}
                onFocus={() => setShowEmpDrop(true)}
                onBlur={() => setTimeout(() => setShowEmpDrop(false), 150)}
                title="Employee"
              />
              {(selectedUserId || employeeQuery) && (
                <button
                  className="px-2 py-1 rounded hover:bg-gray-100"
                  onClick={clearEmployee}
                  type="button"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {showEmpDrop && empMatches.length > 0 && (
            <div
              className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border rounded shadow"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                onClick={clearEmployee}
              >
                All Employees
              </div>

              {empMatches.map((emp) => (
                <div
                  key={emp.employee_code ?? emp.code ?? emp.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleEmployeePick(emp)}
                >
                  <div className="font-medium">
                    {emp.name || "—"}{" "}
                    {emp.employee_code ? (
                      <span className="text-gray-500 text-xs">
                        ({emp.employee_code})
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    Role ID: {emp.role_id || "N/A"}{" "}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Table */}
      {respLoading ? (
        <Loader message="Loading response distribution..." />
      ) : respError ? (
        <div className="p-6 text-sm text-red-600">{respError}</div>
      ) : (
        <>
          <div className="px-6 pt-4 text-sm text-gray-600">
            Total Leads:{" "}
            <span className="font-semibold text-gray-900">
              {responseTotal.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[320px]">
            <table className="min-w-full divide-y divide-gray-200 table-fixed tabular-nums">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Response
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Leads
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {responseRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {r.response_name || r.response || "Unknown"}
                    </td>
                    <td className="px-6 py-3 text-right text-blue-700">
                      {(r.total_leads ?? r.count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {Number(r.percentage ?? 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {responseRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      No response data available for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ResponseDistribution;