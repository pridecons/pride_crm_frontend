import { useState, useEffect, useMemo } from "react";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "../LoadingState";
const Loader =
    LoadingState ??
    (({ message }) => (
        <div className="p-6 text-gray-500">{message || "Loading..."}</div>
    ));

function DashboardTables({ isSuperAdmin, branchId }) {
    // Lead Source (left) state
    const [sourceCard, setSourceCard] = useState({ source_analytics: [] });
    const [srcLoading, setSrcLoading] = useState(true);
    const [srcError, setSrcError] = useState(null);

    // Response Distribution (right) state (NEW endpoint)
    const [respLoading, setRespLoading] = useState(true);
    const [respError, setRespError] = useState(null);
    const [responseTotal, setResponseTotal] = useState(0);
    const [responseRows, setResponseRows] = useState([]);

    // Lookups
    const [branches, setBranches] = useState([]);
    const [sources, setSources] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Filters (right card)
    const ROLE_OPTIONS = ["BA", "SBA", "TL", "SALES MANAGER"];
    const [branchFilter, setBranchFilter] = useState("All"); // tabs (SA only)
    const [employeeRole, setEmployeeRole] = useState("");
    const [selectedSourceId, setSelectedSourceId] = useState("");
    const [selectedUserId, setSelectedUserId] = useState(""); // employee_code
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [applied, setApplied] = useState(false);

    // NEW: employee autocomplete state
    const [employeeQuery, setEmployeeQuery] = useState("");
    const [showEmpDrop, setShowEmpDrop] = useState(false);

    // Load lookups (scoped like in LeadManage)
    useEffect(() => {
        const load = async () => {
            try {
                const [bRes, sRes, uRes] = await Promise.all([
                    axiosInstance.get("/branches/?skip=0&limit=200&active_only=false"),
                    axiosInstance.get("/lead-config/sources/?skip=0&limit=500"),
                    axiosInstance
                        .get("/users/?skip=0&limit=1000&active_only=false")
                        .catch(() => axiosInstance.get("/employee?skip=0&limit=1000")),
                ]);

                const allBranches = Array.isArray(bRes.data) ? bRes.data : [];
                const allEmployees = uRes?.data?.data ?? uRes?.data ?? [];

                if (isSuperAdmin) {
                    setBranches(allBranches);
                    setEmployees(allEmployees);
                } else {
                    const safeBranchId = String(branchId || "");
                    setBranches(allBranches.filter((b) => String(b.id) === safeBranchId));
                    setEmployees(
                        allEmployees.filter(
                            (e) => String(e.branch_id) === safeBranchId
                        )
                    );
                }
                setSources(Array.isArray(sRes.data) ? sRes.data : []);
            } catch (e) {
                console.error("lookup load failed", e);
            }
        };
        if (isSuperAdmin || branchId) load();
    }, [isSuperAdmin, branchId]);

    // Default branch for non-SA
    useEffect(() => {
        if (!isSuperAdmin && branchId) setBranchFilter(String(branchId));
    }, [isSuperAdmin, branchId]);

    // Lead Source (left) — from admin/dashboard (30-day window; scope by branch for non-SA)
    useEffect(() => {
        const fetchSourceCard = async () => {
            try {
                setSrcLoading(true);
                const qs = new URLSearchParams({ days: "30" });

                // If SA selects a branch tab, scope to it; non-SA always scoped to own branch
                const br = isSuperAdmin
                    ? branchFilter !== "All"
                        ? branchFilter
                        : null
                    : branchId;
                if (br) qs.set("branch_id", String(br));

                const { data } = await axiosInstance.get(
                    `/analytics/leads/admin/dashboard?${qs.toString()}`
                );
                setSourceCard({
                    source_analytics: Array.isArray(data?.source_analytics)
                        ? data.source_analytics
                        : [],
                });
                setSrcError(null);
            } catch (err) {
                console.error("source card fetch error:", err);
                setSourceCard({ source_analytics: [] });
                setSrcError("Failed to load analytics data");
            } finally {
                setSrcLoading(false);
            }
        };
        if (isSuperAdmin || branchId) fetchSourceCard();
    }, [isSuperAdmin, branchId, branchFilter]);

    // Response Distribution (right) — NEW endpoint with all filters
    // const fetchResponseAnalytics = async () => {
    //     try {
    //         setRespLoading(true);
    //         const qs = new URLSearchParams();

    //         // date range or fallback to days
    //         if (applied && fromDate && toDate) {
    //             qs.set("from_date", fromDate);
    //             qs.set("to_date", toDate);
    //         } else {
    //             qs.set("days", "30");
    //         }

    //         // branch scope (SA can choose; non-SA fixed)
    //         const br = isSuperAdmin
    //             ? branchFilter !== "All"
    //                 ? branchFilter
    //                 : null
    //             : branchId;
    //         if (br) qs.set("branch_id", String(br));

    //         // extra filters
    //         if (employeeRole) qs.set("employee_role", employeeRole);
    //         if (selectedSourceId) qs.set("source_id", String(selectedSourceId));
    //         if (selectedUserId) qs.set("user_id", String(selectedUserId));

    //         const { data } = await axiosInstance.get(
    //             `/analytics/leads/admin/response-analytics?${qs.toString()}`
    //         );
    //         setResponseTotal(Number(data?.total_leads ?? 0));
    //         setResponseRows(Array.isArray(data?.breakdown) ? data.breakdown : []);
    //         setRespError(null);
    //     } catch (e) {
    //         console.error("response analytics fetch error:", e);
    //         setResponseTotal(0);
    //         setResponseRows([]);
    //         setRespError("Failed to load response analytics");
    //     } finally {
    //         setRespLoading(false);
    //     }
    // };

    useEffect(() => {
        if (isSuperAdmin || branchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        isSuperAdmin,
        branchId,
        branchFilter,
        employeeRole,
        selectedSourceId,
        selectedUserId,
        applied,
        fromDate,
        toDate,
    ]);

    // Handle dates
    const handleClearDates = () => {
        setFromDate("");
        setToDate("");
        setApplied(false);
    };
    const handleApplyDates = () => setApplied(true);

    // NEW: pick & clear handlers
    const handleEmployeePick = (emp) => {
        const code = String(emp.employee_code ?? emp.code ?? "");
        setSelectedUserId(code); // this is what your API uses
        setEmployeeQuery(emp.name ? `${emp.name} (${emp.employee_code ?? ""})` : code);
        setShowEmpDrop(false);
    };

    const clearEmployee = () => {
        setSelectedUserId("");
        setEmployeeQuery("");
        setShowEmpDrop(false);
    };

    // ===== Derived lists for enhanced UX =====
    // Filter employees dropdown by selected branch (and role if chosen)
    const employeesForUI = useMemo(() => {
        let list = [...employees];
        const br = isSuperAdmin
            ? branchFilter !== "All"
                ? branchFilter
                : null
            : branchId;
        if (br) {
            list = list.filter((e) => String(e.branch_id) === String(br));
        }
        if (employeeRole) {
            list = list.filter((e) => String(e.role) === String(employeeRole));
        }
        // Keep selectedUserId valid; if not, reset
        if (
            selectedUserId &&
            !list.some((e) => String(e.employee_code) === String(selectedUserId))
        ) {
            setSelectedUserId("");
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, branchFilter, branchId, isSuperAdmin, employeeRole]);

    // NEW: filtered suggestions for the dropdown (max 20)
    const empMatches = useMemo(() => {
        const q = employeeQuery.trim().toLowerCase();
        const pool = employeesForUI;
        if (!q) return pool.slice(0, 20);
        return pool
            .filter(
                (e) =>
                    (e?.name || "").toLowerCase().includes(q) ||
                    String(e?.employee_code || "").toLowerCase().includes(q)
            )
            .slice(0, 20);
    }, [employeeQuery, employeesForUI]);

    // Reset employee when branch/role changes (optional but cleaner)
    useEffect(() => {
        setSelectedUserId("");
        setEmployeeQuery("");
    }, [branchFilter, employeeRole]);

    const srcRows = sourceCard.source_analytics ?? [];

    // Branch tabs (SA only)
    const branchTabs =
        [{ value: "All", label: "All Branches" }].concat(
            branches.map((b) => ({ value: String(b.id), label: b.name }))
        );

    // NEW: branch id -> name
    const getBranchName = (id) =>
        branches.find((b) => String(b.id) === String(id))?.name ??
        (id ? `Branch ${id}` : "");

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 pb-6">
            {/* ========== Lead Source (balance) ========== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Lead Source Balance
                    </h2>
                </div>

                {srcLoading ? (
                    <Loader message="Loading analytics..." />
                ) : srcError ? (
                    <div className="p-6 text-sm text-red-600">{srcError}</div>
                ) : (
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
                                {srcRows.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {s.source_name}
                                        </td>
                                        <td className="px-6 py-3 text-orange-700">
                                            {(s.total_leads || 0) - (s.converted_leads || 0)}
                                        </td>
                                    </tr>
                                ))}
                                {srcRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={2}
                                            className="px-6 py-6 text-center text-gray-500"
                                        >
                                            No data
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

         
        </div>
    );
}

export default DashboardTables;


//    {/* ========== Response Distribution (new endpoint + ALL filters) ========== */}
            // <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            //     <div className="px-6 py-4 border-b border-gray-100">
            //         <h2 className="text-xl font-semibold text-gray-900">
            //             Response Distribution
            //         </h2>
            //         <p className="text-gray-600 text-sm mt-1">
            //             Breakdown of lead responses
            //         </p>

            //         {/* Branch Tabs (SuperAdmin only) */}
            //         {isSuperAdmin && (
            //             <div className="flex gap-2 overflow-x-auto pt-3">
            //                 {branchTabs.map((opt) => (
            //                     <button
            //                         key={`right-${opt.value}`}
            //                         onClick={() => setBranchFilter(opt.value)}
            //                         className={`px-3 py-1.5 rounded-lg border text-sm whitespace-nowrap ${branchFilter === opt.value
            //                             ? "bg-blue-600 text-white border-blue-600"
            //                             : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
            //                             }`}
            //                         title="Branch"
            //                     >
            //                         {opt.label}
            //                     </button>
            //                 ))}
            //             </div>
            //         )}
            //     </div>

            //     {/* Filters Row */}
            //     <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-3">
            //         {/* Role */}
            //         <select
            //             value={employeeRole}
            //             onChange={(e) => setEmployeeRole(e.target.value)}
            //             className="px-3 py-2 border rounded bg-white"
            //             title="Employee Role"
            //         >
            //             <option value="">All Roles</option>
            //             {ROLE_OPTIONS.map((r) => (
            //                 <option key={r} value={r}>
            //                     {r}
            //                 </option>
            //             ))}
            //         </select>

            //         {/* Source (ID) */}
            //         <select
            //             value={selectedSourceId}
            //             onChange={(e) => setSelectedSourceId(e.target.value)}
            //             className="px-3 py-2 border rounded bg-white"
            //             title="Lead Source"
            //         >
            //             <option value="">All Sources</option>
            //             {sources.map((s) => (
            //                 <option key={s.id} value={String(s.id)}>
            //                     {s.name}
            //                 </option>
            //             ))}
            //         </select>

            //         {/* User (employee_code) — AUTOCOMPLETE */}
            //         <div className="relative w-full sm:w-64">
            //             <div className="flex items-center gap-2">
            //                 <input
            //                     type="text"
            //                     placeholder="Search Employee..."
            //                     className="w-full px-3 py-2 border rounded bg-white"
            //                     value={employeeQuery}
            //                     onChange={(e) => {
            //                         setEmployeeQuery(e.target.value);
            //                         setShowEmpDrop(true);
            //                         if (!e.target.value) setSelectedUserId("");
            //                     }}
            //                     onFocus={() => setShowEmpDrop(true)}
            //                     onBlur={() => setTimeout(() => setShowEmpDrop(false), 150)}
            //                     title="Employee"
            //                 />
            //                 {(selectedUserId || employeeQuery) && (
            //                     <button
            //                         className="px-2 py-1 rounded hover:bg-gray-100"
            //                         onClick={clearEmployee}
            //                         type="button"
            //                         title="Clear"
            //                     >
            //                         ✕
            //                     </button>
            //                 )}
            //             </div>

            //             {showEmpDrop && empMatches.length > 0 && (
            //                 <div
            //                     className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border rounded shadow"
            //                     onMouseDown={(e) => e.preventDefault()} // keep input focus
            //                 >
            //                     {/* Optional first row to select 'All' */}
            //                     <div
            //                         className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
            //                         onClick={clearEmployee}
            //                     >
            //                         All Employees
            //                     </div>

            //                     {empMatches.map((emp) => (
            //                         <div
            //                             key={emp.employee_code ?? emp.code ?? emp.id}
            //                             className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
            //                             onClick={() => handleEmployeePick(emp)}
            //                         >
            //                             <div className="font-medium">
            //                                 {emp.name || "—"}{" "}
            //                                 {emp.employee_code ? (
            //                                     <span className="text-gray-500 text-xs">
            //                                         ({emp.employee_code})
            //                                     </span>
            //                                 ) : null}
            //                             </div>
            //                             <div className="text-xs text-gray-500">
            //                                 {emp.role ? `${emp.role}` : ""} {emp.branch_id ? `• ${getBranchName(emp.branch_id)}` : ""}
            //                             </div>
            //                         </div>
            //                     ))}
            //                 </div>
            //             )}
            //         </div>

            //         {/* Dates + Apply/Clear */}
            //         <div className="flex items-center gap-2">
            //             <input
            //                 type="date"
            //                 value={fromDate}
            //                 onChange={(e) => {
            //                     setFromDate(e.target.value);
            //                     setApplied(false);
            //                 }}
            //                 className="border rounded px-2 py-1 text-sm"
            //                 title="From (YYYY-MM-DD)"
            //             />
            //             <span className="text-gray-400">–</span>
            //             <input
            //                 type="date"
            //                 value={toDate}
            //                 onChange={(e) => {
            //                     setToDate(e.target.value);
            //                     setApplied(false);
            //                 }}
            //                 className="border rounded px-2 py-1 text-sm"
            //                 title="To (YYYY-MM-DD)"
            //             />
            //             {applied ? (
            //                 <button
            //                     onClick={handleClearDates}
            //                     className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            //                 >
            //                     Clear
            //                 </button>
            //             ) : fromDate || toDate ? (
            //                 fromDate && toDate ? (
            //                     <button
            //                         onClick={handleApplyDates}
            //                         className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
            //                     >
            //                         Apply
            //                     </button>
            //                 ) : (
            //                     <button
            //                         onClick={handleClearDates}
            //                         className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            //                     >
            //                         Clear
            //                     </button>
            //                 )
            //             ) : null}
            //         </div>
            //     </div> 

            //     {/* Table */}
            //     {respLoading ? (
            //         <Loader message="Loading response distribution..." />
            //     ) : respError ? (
            //         <div className="p-6 text-sm text-red-600">{respError}</div>
            //     ) : (
            //         <>
            //             <div className="px-6 pt-4 text-sm text-gray-600">
            //                 Total Leads:{" "}
            //                 <span className="font-semibold text-gray-900">
            //                     {responseTotal}
            //                 </span>
            //             </div>

            //             <div className="overflow-x-auto max-h-[320px]">
            //                 <table className="min-w-full divide-y divide-gray-200 table-fixed tabular-nums">
            //                     <thead className="bg-gray-50 top-0 ">
            //                         <tr>
            //                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            //                                 Response
            //                             </th>
            //                             <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
            //                                 Total Leads
            //                             </th>
            //                             <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
            //                                 Percentage
            //                             </th>
            //                         </tr>
            //                     </thead>
            //                     <tbody className="bg-white divide-y divide-gray-100">
            //                         {responseRows.map((r, idx) => (
            //                             <tr key={idx} className="hover:bg-gray-50">
            //                                 <td className="px-6 py-3 font-medium text-gray-900">
            //                                     {r.response_name}
            //                                 </td>
            //                                 <td className="px-6 py-3 text-right text-blue-700">
            //                                     {r.total_leads}
            //                                 </td>
            //                                 <td className="px-6 py-3 text-right">
            //                                     {r.percentage}%
            //                                 </td>
            //                             </tr>
            //                         ))}
            //                         {responseRows.length === 0 && (
            //                             <tr>
            //                                 <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
            //                                     No data
            //                                 </td>
            //                             </tr>
            //                         )}
            //                     </tbody>
            //                 </table>
            //             </div>



            //         </>
            //     )}
            // </div>