// "use client";

// import { useEffect, useMemo, useState, useCallback } from "react";
// import Cookies from "js-cookie";
// import { axiosInstance } from "@/api/Axios";
// import LoadingState from "@/components/LoadingState";
// import StoryModal from "@/components/Lead/StoryModal";
// import CommentModal from "@/components/Lead/CommentModal";
// import InvoiceList from "@/components/Lead/InvoiceList";
// import { Eye, FileText, BookOpenText, MessageCircle } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { usePermissions } from "@/context/PermissionsContext";

// // --- role helpers ------------------------------------------------------------
// const normalizeRoleKey = (r) => {
//   const key = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
//   if (key === "SUPER_ADMINISTRATOR") return "SUPERADMIN";
//   if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
//   return key;
// };

// // Map role_id -> readable role name (fallback to id if unknown)
// const ROLE_BY_ID = {
//   "1": "SUPERADMIN",
//   "2": "BRANCH MANAGER",
//   "3": "HR",
//   "4": "SALES MANAGER",
//   "5": "TL",
//   "6": "SBA",
//   "7": "BA",
//   "8": "BA",
//   "9": "RESEARCHER",
//   "10": "COMPLIANCE OFFICER",
// };
// const roleFromId = (id) => ROLE_BY_ID[String(id ?? "")] || String(id ?? "");

// const getUserMeta = () => {
//   try {
//     const raw = Cookies.get("user_info");
//     if (!raw) return { role: "", branch_id: null };
//     const p = JSON.parse(raw);

//     const rawRole =
//       p?.role ||
//       p?.role_name ||
//       p?.user?.role ||
//       p?.user?.role_name ||
//       "";

//     const role = normalizeRoleKey(rawRole);

//     const branch_id =
//       p?.branch_id ?? p?.user?.branch_id ?? p?.branch?.id ?? null;

//     return { role, branch_id };
//   } catch {
//     return { role: "", branch_id: null };
//   }
// };

// // ---- tiny helpers to read API safely ---------------------------------------
// const parseServices = (client) => {
//   // 1) Prefer latest_payment.plan[0].service_type array
//   const svcFromPlan =
//     Array.isArray(client?.latest_payment?.plan) &&
//       Array.isArray(client.latest_payment.plan[0]?.service_type)
//       ? client.latest_payment.plan[0].service_type
//       : null;

//   if (svcFromPlan && svcFromPlan.length) return svcFromPlan;

//   // 2) Fallback: latest_payment.service (array of strings like "Equity Cash,Stock Future")
//   if (
//     Array.isArray(client?.latest_payment?.service) &&
//     client.latest_payment.service.length > 0
//   ) {
//     // Split by commas and trim
//     return client.latest_payment.service
//       .flatMap((s) => String(s).split(","))
//       .map((s) => s.trim())
//       .filter(Boolean);
//   }

//   // 3) Fallback: segment string like '["Equity Cash", "Stock Future"]'
//   if (typeof client?.segment === "string") {
//     try {
//       const arr = JSON.parse(client.segment);
//       if (Array.isArray(arr)) return arr;
//     } catch (_) {
//       /* ignore parse errors */
//     }
//   }

//   return [];
// };

// const lastPaymentISO = (client) => client?.latest_payment?.created_at || null;

// // ------------- date filter helpers (client-side filtering) -------------------
// const buildRange = (from, to) => {
//   const start = from ? new Date(`${from}T00:00:00`) : null;
//   const end = to ? new Date(`${to}T23:59:59.999`) : null;
//   return { start, end };
// };

// /**
//  * Choose which timestamp a "date filter" should use.
//  * If you want strictly "client created date" filter, use c.created_at only.
//  * Here we default to `created_at`, and fallback to last payment if missing.
//  */
// const pickWhen = (c) => c?.created_at || c?.latest_payment?.created_at || null;

// const isIsoInRange = (iso, start, end) => {
//   if (!iso) return false;
//   const d = new Date(iso);
//   if (start && d < start) return false;
//   if (end && d > end) return false;
//   return true;
// };

// // ---------------------------------------------------------------------------

// export default function ClientsPage() {
//   const { hasPermission } = usePermissions();
//   const [role, setRole] = useState(null);
//   const [branchId, setBranchId] = useState(null);
//   const [branches, setBranches] = useState([]);
//   const [clients, setClients] = useState([]);
//   const [myClients, setMyClients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("card");
//   const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
//   const [selectedLead, setSelectedLead] = useState(null);
//   const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
//   const [selectedLeadId, setSelectedLeadId] = useState(null);
//   const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
//   const [storyLead, setStoryLead] = useState(null);
//   const [myView, setMyView] = useState("self"); // for non-managers: self | other

//   // date filter inputs
//   const [dateFrom, setDateFrom] = useState(""); // "YYYY-MM-DD"
//   const [dateTo, setDateTo] = useState("");

//   const router = useRouter();

//   // ---- single bootstrap effect (removed duplicate) -------------------------
//   useEffect(() => {
//     const { role: r, branch_id: b } = getUserMeta();
//     setRole(r);
//     setBranchId(b);

//     if (r === "SUPERADMIN") {
//       fetchBranches();
//       fetchClients(); // SUPERADMIN -> all branches (view=all)
//     } else if (r === "BRANCH MANAGER") {
//       fetchClients(b); // MANAGER -> own branch (view=all)
//     } else {
//       fetchMyClients("self"); // Non-managers default to self scope
//       setMyView("self");
//     }
//   }, []);

//   const fetchBranches = async () => {
//     try {
//       const res = await axiosInstance.get(
//         "/branches/?skip=0&limit=100&active_only=false"
//       );
//       setBranches(res.data || []);
//     } catch (err) {
//       console.error("Failed to fetch branches:", err);
//     }
//   };

//   // reuse this for Apply in any toolbar
// const applyDate = useCallback(() => {
//    if (role === "SUPERADMIN") fetchClients(branchId || null);
//    else if (role === "BRANCH MANAGER") fetchClients(branchId);
//    else fetchMyClients(myView);
// }, [role, branchId, myView]);

//   const fetchClients = async (branch = null) => {
//     try {
//       setLoading(true);
//       const qs = new URLSearchParams({ page: "1", limit: "100", view: "all" });
//       if (branch) qs.append("branch_id", String(branch));

//       const res = await axiosInstance.get(`/clients/?${qs.toString()}`);
//       const list = Array.isArray(res.data) ? res.data : res.data?.clients;
//       setClients(Array.isArray(list) ? list : []);
//     } catch (err) {
//       console.error("Error fetching clients:", err);
//       setClients([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchMyClients = async (scope = "self") => {
//     try {
//       setLoading(true);
//       const res = await axiosInstance.get(
//         `/clients/?page=1&limit=50&view=${scope}`
//       );
//       setMyClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
//     } catch (err) {
//       console.error("Error fetching clients (scope:", scope, "):", err);
//       setMyClients([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ---------- memoized filtered arrays (apply date range on the client) -----
//   const { start, end } = useMemo(
//     () => buildRange(dateFrom, dateTo),
//     [dateFrom, dateTo]
//   );

//   const filteredClients = useMemo(() => {
//     if (!dateFrom && !dateTo) return clients;
//     return clients.filter((c) => isIsoInRange(pickWhen(c), start, end));
//   }, [clients, dateFrom, dateTo, start, end]);

//   const filteredMyClients = useMemo(() => {
//     if (!dateFrom && !dateTo) return myClients;
//     return myClients.filter((c) => isIsoInRange(pickWhen(c), start, end));
//   }, [myClients, dateFrom, dateTo, start, end]);

//   // ------------------------------- UI ---------------------------------------
//   const renderClientCard = (client) => (
//     <div
//       key={client.lead_id}
//       className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
//     >
//       <div className="space-y-3">
//         <div className="border-b border-gray-100 pb-3">
//           <h3 className="font-semibold text-lg text-gray-900">
//             {client.full_name}
//           </h3>
//         </div>
//         <div className="space-y-2 text-sm">
//           <div className="flex">
//             <span className="text-gray-500 w-24">Email:</span>
//             <span className="text-gray-700 truncate">{client.email || "—"}</span>
//           </div>
//           <div className="flex">
//             <span className="text-gray-500 w-24">Mobile:</span>
//             <span className="text-gray-700">{client.mobile || "—"}</span>
//           </div>
//           <div className="flex">
//             <span className="text-gray-500 w-24">City:</span>
//             <span className="text-gray-700">{client.city || "—"}</span>
//           </div>
//           <div className="flex">
//             <span className="text-gray-500 w-24">Branch:</span>
//             <span className="text-gray-700">{client.branch_name || "—"}</span>
//           </div>
//           {/* Assigned To */}
//           <div className="flex">
//             <span className="text-gray-500 w-24">Assigned:</span>
//             <span className="text-gray-700">
//               {client?.assigned_employee
//                 ? `${client.assigned_employee.name || "—"} (${roleFromId(
//                   client.assigned_employee.role_id
//                 )})`
//                 : "—"}
//             </span>
//           </div>

//           <div className="flex">
//             <span className="text-gray-500 w-24">KYC:</span>
//             <span
//               className={`text-sm font-medium ${client.kyc_status ? "text-green-600" : "text-red-600"
//                 }`}
//             >
//               {client.kyc_status ? "DONE" : "PENDING"}
//             </span>
//           </div>
//         </div>
//         <div className="pt-3 mt-3 border-t border-gray-100">
//           <div className="flex justify-between items-center">
//             <div>
//               <p className="text-xs text-gray-500">Total Paid</p>
//               <p className="text-lg font-semibold text-green-600 rupee">
//                 ₹{client.total_amount_paid ?? 0}
//               </p>
//             </div>
//             {client?.latest_payment?.mode && (
//               <div className="text-right">
//                 <p className="text-xs text-gray-500">Payment Mode</p>
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                   {client.latest_payment.mode}
//                 </span>
//               </div>
//             )}
//           </div>
//           <div className="pt-3 flex gap-2 justify-end">
//             <button
//               onClick={() => router.push(`/lead/${client.lead_id}`)}
//               className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
//               title="Edit Lead"
//             >
//               <Eye size={18} />
//             </button>
//             <button
//               onClick={() => {
//                 setSelectedLead(client);
//                 setIsInvoiceModalOpen(true);
//               }}
//               className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white hover:bg-blue-600 rounded-full shadow transition"
//               aria-label="View Invoices"
//             >
//               <FileText size={18} />
//             </button>
//             <button
//               onClick={() => {
//                 setStoryLead(client);
//                 setIsStoryModalOpen(true);
//               }}
//               className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
//               aria-label="View Story"
//             >
//               <BookOpenText size={18} />
//             </button>
//             <button
//               onClick={() => {
//                 setSelectedLeadId(client.lead_id); // ensure we pass lead_id
//                 setIsCommentModalOpen(true);
//               }}
//               className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
//               title="Comments"
//             >
//               <MessageCircle size={16} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
//           <div className="mb-4 flex flex-col gap-4">
//             {role === "SUPERADMIN" && hasPermission("client_select_branch") && (
//               <div>
//                 <label className="text-sm font-semibold text-gray-700 mb-1 block">
//                   Select Branch
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                   <button
//                     onClick={() => {
//                       setBranchId(null);
//                       fetchClients(null);
//                     }}
//                     className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${!branchId
//                         ? "bg-blue-600 text-white border-blue-600 shadow-md"
//                         : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
//                       }`}
//                   >
//                     All Branches
//                   </button>
//                   {branches.map((branch) => {
//                     const isActive = branchId === branch.id;
//                     return (
//                       <button
//                         key={branch.id}
//                         onClick={() => {
//                           setBranchId(branch.id);
//                           fetchClients(branch.id);
//                         }}
//                         className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${isActive
//                             ? "bg-blue-600 text-white border-blue-600 shadow-md"
//                             : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
//                           }`}
//                       >
//                         {branch.name}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//             <div className="flex flex-wrap items-end justify-between gap-3">
//   {/* Card/Table toggle (left) */}
//   <div className="inline-flex rounded-md shadow-sm" role="group">
//     <button
//       type="button"
//       className={`px-4 py-3 text-sm font-medium border ${
//         view === "card"
//           ? "bg-blue-600 text-white border-blue-600 shadow-md"
//           : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
//       } border-gray-300 rounded-l-lg`}
//       onClick={() => setView("card")}
//     >
//       Card View
//     </button>
//     <button
//       type="button"
//       className={`px-4 py-3 text-sm font-medium border ${
//         view === "table"
//           ? "bg-blue-600 text-white border-blue-600 shadow-md"
//           : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
//       } border-gray-300 rounded-r-lg`}
//       onClick={() => setView("table")}
//     >
//       Table View
//     </button>
//   </div>

//   {/* Date range + actions (right) */}
//   <div className="flex flex-wrap items-end gap-2">
//     <div>
//       <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
//       <input
//         type="date"
//         value={dateFrom}
//         onChange={(e) => setDateFrom(e.target.value)}
//         className="border rounded-lg px-3 py-2 text-sm"
//       />
//     </div>
//     <div>
//       <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
//       <input
//         type="date"
//         value={dateTo}
//         onChange={(e) => setDateTo(e.target.value)}
//         className="border rounded-lg px-3 py-2 text-sm"
//       />
//     </div>
//     <button
//       type="button"
//       onClick={applyDate}
//       className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
//     >
//       Apply
//     </button>
//     {(dateFrom || dateTo) && (
//       <button
//         type="button"
//         onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
//         className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm border"
//       >
//         Clear
//       </button>
//     )}
//   </div>
// </div>

//           </div>
//         )}

//         {loading ? (
//           <LoadingState message="Loading Clients..." />
//         ) : role === "SUPERADMIN" || role === "BRANCH MANAGER" ? (
//           view === "card" ? (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {filteredClients.map((client) => renderClientCard(client))}
//             </div>
//           ) : (
//             <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     {[
//                       "Name",
//                       "Email",
//                       "Mobile",
//                       "City",
//                       "Branch",
//                       "Assigned",
//                       "KYC Status",
//                       "Paid",
//                       "Actions",
//                     ].map((h) => (
//                       <th
//                         key={h}
//                         className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                       >
//                         {h}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {filteredClients.map((client) => (
//                     <tr key={client.lead_id}>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                         {client.full_name}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         {client.email || "—"}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         {client.mobile || "—"}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         {client.city || "—"}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         {client.branch_name || "—"}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         {client?.assigned_employee
//                           ? `${client.assigned_employee.name || "—"} (${roleFromId(
//                             client.assigned_employee.role_id
//                           )})`
//                           : "—"}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm">
//                         <span
//                           className={`${client.kyc_status
//                               ? "text-green-600 font-semibold"
//                               : "text-red-600"
//                             }`}
//                         >
//                           {client.kyc_status ? "DONE" : "PENDING"}
//                         </span>
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-green-600 rupee">
//                         ₹{client.total_amount_paid ?? 0}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
//                         <div className="flex items-center gap-1.5">
//                           <button
//                             onClick={() => router.push(`/lead/${client.lead_id}`)}
//                             className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
//                             title="Edit Lead"
//                           >
//                             <Eye size={18} />
//                           </button>
//                           {hasPermission("client_invoice") && (
//                             <button
//                               onClick={() => {
//                                 setSelectedLead(client);
//                                 setIsInvoiceModalOpen(true);
//                               }}
//                               className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white hover:bg-blue-600 rounded-full shadow transition"
//                               aria-label="View Invoices"
//                             >
//                               <FileText size={18} />
//                             </button>
//                           )}
//                           {hasPermission("client_story") && (
//                             <button
//                               onClick={() => {
//                                 setStoryLead(client);
//                                 setIsStoryModalOpen(true);
//                               }}
//                               className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
//                               title="View Story"
//                             >
//                               <BookOpenText size={18} />
//                             </button>
//                           )}
//                           {hasPermission("client_comments") && (
//                             <button
//                               onClick={() => {
//                                 setSelectedLeadId(client.lead_id);
//                                 setIsCommentModalOpen(true);
//                               }}
//                               className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
//                               title="Comment"
//                             >
//                               <MessageCircle size={16} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )
//         ) : (
//           // My Clients Table for other roles
//           <>
//             {!(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
//               <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
//                 {/* Tabs */}
//                 <div className="inline-flex rounded-md shadow-sm" role="group">
//                   {["self", "other"].map((v, i) => (
//                     <button
//                       key={v}
//                       type="button"
//                       onClick={() => {
//                         if (myView !== v) {
//                           setMyView(v);
//                           fetchMyClients(v);
//                         }
//                       }}
//                       className={`px-4 py-2 text-sm font-medium border
//             ${myView === v
//                           ? "bg-blue-600 text-white border-blue-600 shadow-md"
//                           : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}
//             ${i === 0 ? "rounded-l-lg" : "rounded-r-lg"}`}
//                     >
//                       {v === "self" ? "My Clients" : "My team"}
//                     </button>
//                   ))}
//                 </div>

//                 {/* Date range + actions */}
//                 <div className="flex flex-wrap items-end gap-2">
//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
//                     <input
//                       type="date"
//                       value={dateFrom}
//                       onChange={(e) => setDateFrom(e.target.value)}
//                       className="border rounded-lg px-3 py-2 text-sm"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
//                     <input
//                       type="date"
//                       value={dateTo}
//                       onChange={(e) => setDateTo(e.target.value)}
//                       className="border rounded-lg px-3 py-2 text-sm"
//                     />
//                   </div>
//                   <button
//                     type="button"
//                     onClick={applyDate}
//                     className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
//                   >
//                     Apply
//                   </button>
//                   {(dateFrom || dateTo) && (
//                     <button
//                       type="button"
//                       onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
//                       className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm border"
//                     >
//                       Clear
//                     </button>
//                   )}
//                 </div>
//               </div>
//             )}


//             <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <colgroup>
//                   <col className="w-[18%]" />
//                   <col className="w-[22%]" />
//                   <col className="w-[12%]" />
//                   <col className="w-[10%]" />
//                   <col className="w-[12%]" />
//                   <col className="w-[10%]" />
//                   <col className="w-[10%]" />
//                   <col className="w-[12%]" />
//                   <col className="w-[8%]" />
//                 </colgroup>

//                 <thead className="bg-gray-50">
//                   <tr>
//                     {[
//                       "Name",
//                       "Email",
//                       "Mobile",
//                       "Investment",
//                       "Services",
//                       "Last Payment",
//                       "Assigned",
//                       "Actions",
//                     ].map((h) => (
//                       <th
//                         key={h}
//                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                       >
//                         {h}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>

//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {Array.isArray(filteredMyClients) &&
//                     filteredMyClients.map((client) => {
//                       const services = parseServices(client);
//                       const lastPaidAt = lastPaymentISO(client);
//                       return (
//                         <tr
//                           key={client.lead_id}
//                           className="align-top odd:bg-white even:bg-slate-50 hover:bg-blue-50/50 transition-colors"
//                         >
//                           {/* NAME */}
//                           <td className="px-4 py-3 text-sm font-semibold text-gray-900">
//                             <span className="line-clamp-1">{client.full_name}</span>
//                           </td>

//                           {/* EMAIL */}
//                           <td className="px-4 py-3 text-sm text-gray-700">
//                             <span
//                               className="block truncate max-w-[260px]"
//                               title={client.email || ""}
//                             >
//                               {client.email || "—"}
//                             </span>
//                           </td>

//                           {/* MOBILE */}
//                           <td className="px-4 py-3 text-sm text-gray-700">
//                             <span className="whitespace-nowrap">
//                               {client.mobile || "—"}
//                             </span>
//                           </td>

//                           {/* INVESTMENT (₹) */}
//                           <td className="px-4 py-3 text-sm font-medium text-green-600 rupee">
//                             {typeof client.investment === "number"
//                               ? `₹${client.investment}`
//                               : typeof client.total_amount_paid === "number"
//                                 ? `₹${client.total_amount_paid}`
//                                 : "—"}
//                           </td>

//                           {/* SERVICES (scrollable) */}
//                           <td className="px-4 py-3 text-sm text-gray-700">
//                             {services.length ? (
//                               <div className="max-h-16 overflow-y-auto pr-1 thin-scroll">
//                                 <div className="flex flex-wrap gap-1">
//                                   {services.map((service, idx) => (
//                                     <span
//                                       key={`${client.lead_id}-${idx}`}
//                                       className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
//                                       title={service}
//                                     >
//                                       <span className="max-w-[140px] truncate">
//                                         {service}
//                                       </span>
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : (
//                               "—"
//                             )}
//                           </td>

//                           {/* LAST PAYMENT (date) */}
//                           <td className="px-4 py-3 text-sm text-gray-700">
//                             {lastPaidAt
//                               ? new Date(lastPaidAt).toLocaleDateString("en-GB", {
//                                 day: "2-digit",
//                                 month: "short",
//                                 year: "numeric",
//                               })
//                               : "—"}
//                           </td>

//                           {/* ASSIGNED */}
//                           <td className="px-4 py-3 text-sm text-gray-700">
//                             {client?.assigned_employee
//                               ? `${client.assigned_employee.name || "—"} (${roleFromId(
//                                 client.assigned_employee.role_id
//                               )})`
//                               : "—"}
//                           </td>

//                           {/* ACTIONS */}
//                           <td className="px-4 py-3 text-sm">
//                             <div className="flex items-center gap-2">
//                               <button
//                                 onClick={() => router.push(`/lead/${client.lead_id}`)}
//                                 className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
//                                 title="Edit Lead"
//                               >
//                                 <Eye size={18} />
//                               </button>

//                               <button
//                                 onClick={() => {
//                                   setStoryLead(client);
//                                   setIsStoryModalOpen(true);
//                                 }}
//                                 className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
//                                 title="View Story"
//                               >
//                                 <BookOpenText size={18} />
//                               </button>

//                               <button
//                                 onClick={() => {
//                                   setSelectedLeadId(client.lead_id);
//                                   setIsCommentModalOpen(true);
//                                 }}
//                                 className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
//                                 title="Comment"
//                               >
//                                 <MessageCircle size={16} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                 </tbody>
//               </table>
//             </div>
//           </>
//         )}

//         {/* Empty State */}
//         {!loading &&
//           ((role === "SUPERADMIN" || role === "BRANCH MANAGER")
//             ? filteredClients.length === 0
//             : filteredMyClients.length === 0) && (
//             <div className="text-center py-12">
//               <svg
//                 className="mx-auto h-12 w-12 text-gray-400"
//                 fill="none"
//                 viewBox="0 0 24 24"
//                 stroke="currentColor"
//               >
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
//               </svg>
//               <h3 className="mt-2 text-sm font-medium text-gray-900">
//                 No clients found
//               </h3>
//               <p className="mt-1 text-sm text-gray-500">
//                 {branchId
//                   ? "Try selecting a different branch or date range."
//                   : "Try changing the date range."}
//               </p>
//             </div>
//           )}

//         {/* Modals (lead_id FIXED) */}
//         {isCommentModalOpen && (
//           <CommentModal
//             isOpen={isCommentModalOpen}
//             onClose={() => setIsCommentModalOpen(false)}
//             leadId={selectedLeadId}
//           />
//         )}
//         {storyLead && isStoryModalOpen && (
//           <StoryModal
//             isOpen={isStoryModalOpen}
//             onClose={() => setIsStoryModalOpen(false)}
//             leadId={storyLead?.lead_id}
//           />
//         )}
//         <InvoiceList
//           isOpen={isInvoiceModalOpen}
//           onClose={() => setIsInvoiceModalOpen(false)}
//           leadId={selectedLead?.lead_id}
//         />
//       </div>
//     </div>
//   );
// }




"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import InvoiceList from "@/components/Lead/InvoiceList";
import { Eye, FileText, BookOpenText, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/context/PermissionsContext";

// --- role helpers ------------------------------------------------------------
const normalizeRoleKey = (r) => {
  const key = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "SUPER_ADMINISTRATOR") return "SUPERADMIN";
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  return key;
};

// Build role map from API /profile-role
const ROLE_CACHE_KEY = "role_map_v1";
const ROLE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// Normalize to the same display you already use in UI
const toDisplayRole = (raw) => {
  const key = normalizeRoleKey(raw);
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  if (key === "COMPLIANCE_OFFICER") return "COMPLIANCE OFFICER";
  return key;
};

const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "", branch_id: null };
    const p = JSON.parse(raw);

    const rawRole =
      p?.role ||
      p?.role_name ||
      p?.user?.role ||
      p?.user?.role_name ||
      "";

    const role = normalizeRoleKey(rawRole);

    const branch_id =
      p?.branch_id ?? p?.user?.branch_id ?? p?.branch?.id ?? null;

    return { role, branch_id };
  } catch {
    return { role: "", branch_id: null };
  }
};

// ---- tiny helpers to read API safely ---------------------------------------
const parseServices = (client) => {
  // 1) Prefer latest_payment.plan[0].service_type array
  const svcFromPlan =
    Array.isArray(client?.latest_payment?.plan) &&
      Array.isArray(client.latest_payment.plan[0]?.service_type)
      ? client.latest_payment.plan[0].service_type
      : null;

  if (svcFromPlan && svcFromPlan.length) return svcFromPlan;

  // 2) Fallback: latest_payment.service (array of strings like "Equity Cash,Stock Future")
  if (
    Array.isArray(client?.latest_payment?.service) &&
    client.latest_payment.service.length > 0
  ) {
    // Split by commas and trim
    return client.latest_payment.service
      .flatMap((s) => String(s).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 3) Fallback: segment string like '["Equity Cash", "Stock Future"]'
  if (typeof client?.segment === "string") {
    try {
      const arr = JSON.parse(client.segment);
      if (Array.isArray(arr)) return arr;
    } catch (_) {
      /* ignore parse errors */
    }
  }

  return [];
};

const lastPaymentISO = (client) => client?.latest_payment?.created_at || null;

// ------------- date filter helpers (client-side filtering) -------------------
const buildRange = (from, to) => {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;
  return { start, end };
};

/**
 * Choose which timestamp a "date filter" should use.
 * If you want strictly "client created date" filter, use c.created_at only.
 * Here we default to `created_at`, and fallback to last payment if missing.
 */
const pickWhen = (c) => c?.created_at || c?.latest_payment?.created_at || null;

const isIsoInRange = (iso, start, end) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

// ---------------------------------------------------------------------------

export default function ClientsPage() {
  const { hasPermission } = usePermissions();
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("card");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLead, setStoryLead] = useState(null);
  const [myView, setMyView] = useState("self"); // for non-managers: self | other

  // date filter inputs
  const [dateFrom, setDateFrom] = useState(""); // "YYYY-MM-DD"
  const [dateTo, setDateTo] = useState("");

  const router = useRouter();

  const [roleMap, setRoleMap] = useState({});

  const roleFromId = useCallback(
    (id) => {
      const k = String(id ?? "");
      return roleMap[k] || k; // fall back to the id if not yet loaded
    },
    [roleMap]
  );

  useEffect(() => {
    // ---- 1) Load role map from cache (if fresh) ------------------------------
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      if (raw) {
        const { ts, map } = JSON.parse(raw);
        if (Date.now() - ts < ROLE_CACHE_TTL && map && typeof map === "object") {
          setRoleMap(map);
        }
      }
    } catch {
      // ignore cache errors
    }

    // ---- 2) Fetch fresh role map in background -------------------------------
    (async () => {
      try {
        const res = await axiosInstance.get(
          "/profile-role/?skip=0&limit=200&order_by=hierarchy_level"
        );
        const arr = Array.isArray(res.data) ? res.data : [];
        const map = {};
        for (const r of arr) {
          if (!r || r.id == null) continue;
          map[String(r.id)] = toDisplayRole(r.name); // normalize display
        }
        setRoleMap(map);
        try {
          localStorage.setItem(
            ROLE_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), map })
          );
        } catch {
          // ignore cache write errors
        }
      } catch (err) {
        console.error("Failed to load role map:", err);
      }
    })();

    // ---- 3) Existing bootstrap: read user meta & hydrate lists ----------------
    const { role: r, branch_id: b } = getUserMeta();
    setRole(r);
    setBranchId(b);

    if (r === "SUPERADMIN") {
      // SA can see all branches/clients
      fetchBranches();
      fetchClients(); // all branches
    } else if (r === "BRANCH MANAGER") {
      // BM locked to own branch
      fetchClients(b);
    } else {
      // Other roles: default to self scope
      fetchMyClients("self");
      setMyView("self");
    }
  }, []);
  const fetchBranches = async () => {
    try {
      const res = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      setBranches(res.data || []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  // reuse this for Apply in any toolbar
  const applyDate = useCallback(() => {
    if (role === "SUPERADMIN") fetchClients(branchId || null);
    else if (role === "BRANCH MANAGER") fetchClients(branchId);
    else fetchMyClients(myView);
  }, [role, branchId, myView]);

  const fetchClients = async (branch = null) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: "1", limit: "100", view: "all" });
      if (branch) qs.append("branch_id", String(branch));

      const res = await axiosInstance.get(`/clients/?${qs.toString()}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.clients;
      setClients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClients = async (scope = "self") => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/clients/?page=1&limit=50&view=${scope}`
      );
      setMyClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
    } catch (err) {
      console.error("Error fetching clients (scope:", scope, "):", err);
      setMyClients([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- memoized filtered arrays (apply date range on the client) -----
  const { start, end } = useMemo(
    () => buildRange(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filteredClients = useMemo(() => {
    if (!dateFrom && !dateTo) return clients;
    return clients.filter((c) => isIsoInRange(pickWhen(c), start, end));
  }, [clients, dateFrom, dateTo, start, end]);

  const filteredMyClients = useMemo(() => {
    if (!dateFrom && !dateTo) return myClients;
    return myClients.filter((c) => isIsoInRange(pickWhen(c), start, end));
  }, [myClients, dateFrom, dateTo, start, end]);

  // ------------------------------- UI ---------------------------------------
  const renderClientCard = (client) => (
    <div
      key={client.lead_id}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="space-y-3">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="font-semibold text-lg text-gray-900">
            {client.full_name}
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="text-gray-500 w-24">Email:</span>
            <span className="text-gray-700 truncate">{client.email || "—"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24">Mobile:</span>
            <span className="text-gray-700">{client.mobile || "—"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24">City:</span>
            <span className="text-gray-700">{client.city || "—"}</span>
          </div>
          <div className="flex">
            <span className="text-gray-500 w-24">Branch:</span>
            <span className="text-gray-700">{client.branch_name || "—"}</span>
          </div>
          {/* Assigned To */}
          <div className="flex">
            <span className="text-gray-500 w-24">Assigned:</span>
            <span className="text-gray-700">
              {client?.assigned_employee
                ? `${client.assigned_employee.name || "—"} (${roleFromId(
                  client.assigned_employee.role_id
                )})`
                : "—"}
            </span>
          </div>

          <div className="flex">
            <span className="text-gray-500 w-24">KYC:</span>
            <span
              className={`text-sm font-medium ${client.kyc_status ? "text-green-600" : "text-red-600"
                }`}
            >
              {client.kyc_status ? "DONE" : "PENDING"}
            </span>
          </div>
        </div>
        <div className="pt-3 mt-3 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-lg font-semibold text-green-600 rupee">
                ₹{client.total_amount_paid ?? 0}
              </p>
            </div>
            {client?.latest_payment?.mode && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Payment Mode</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {client.latest_payment.mode}
                </span>
              </div>
            )}
          </div>
          <div className="pt-3 flex gap-2 justify-end">
            <button
              onClick={() => router.push(`/lead/${client.lead_id}`)}
              className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
              title="Edit Lead"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => {
                setSelectedLead(client);
                setIsInvoiceModalOpen(true);
              }}
              className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white hover:bg-blue-600 rounded-full shadow transition"
              aria-label="View Invoices"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => {
                setStoryLead(client);
                setIsStoryModalOpen(true);
              }}
              className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
              aria-label="View Story"
            >
              <BookOpenText size={18} />
            </button>
            <button
              onClick={() => {
                setSelectedLeadId(client.lead_id); // ensure we pass lead_id
                setIsCommentModalOpen(true);
              }}
              className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
              title="Comments"
            >
              <MessageCircle size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
          <div className="mb-4 flex flex-col gap-4">
            {role === "SUPERADMIN" && hasPermission("client_select_branch") && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Select Branch
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setBranchId(null);
                      fetchClients(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${!branchId
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                      }`}
                  >
                    All Branches
                  </button>
                  {branches.map((branch) => {
                    const isActive = branchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setBranchId(branch.id);
                          fetchClients(branch.id);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                          }`}
                      >
                        {branch.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3">
              {/* Card/Table toggle (left) */}
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  className={`px-4 py-3 text-sm font-medium border ${view === "card"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    } border-gray-300 rounded-l-lg`}
                  onClick={() => setView("card")}
                >
                  Card View
                </button>
                <button
                  type="button"
                  className={`px-4 py-3 text-sm font-medium border ${view === "table"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                    } border-gray-300 rounded-r-lg`}
                  onClick={() => setView("table")}
                >
                  Table View
                </button>
              </div>

              {/* Date range + actions (right) */}
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyDate}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                >
                  Apply
                </button>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm border"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {loading ? (
          <LoadingState message="Loading Clients..." />
        ) : role === "SUPERADMIN" || role === "BRANCH MANAGER" ? (
          view === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client) => renderClientCard(client))}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Name",
                      "Email",
                      "Mobile",
                      "City",
                      "Branch",
                      "Assigned",
                      "KYC Status",
                      "Paid",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.lead_id}>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.full_name}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.email || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.mobile || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.city || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client.branch_name || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        {client?.assigned_employee
                          ? `${client.assigned_employee.name || "—"} (${roleFromId(
                            client.assigned_employee.role_id
                          )})`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`${client.kyc_status
                            ? "text-green-600 font-semibold"
                            : "text-red-600"
                            }`}
                        >
                          {client.kyc_status ? "DONE" : "PENDING"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-green-600 rupee">
                        ₹{client.total_amount_paid ?? 0}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => router.push(`/lead/${client.lead_id}`)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
                            title="Edit Lead"
                          >
                            <Eye size={18} />
                          </button>
                          {hasPermission("client_invoice") && (
                            <button
                              onClick={() => {
                                setSelectedLead(client);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white hover:bg-blue-600 rounded-full shadow transition"
                              aria-label="View Invoices"
                            >
                              <FileText size={18} />
                            </button>
                          )}
                          {hasPermission("client_story") && (
                            <button
                              onClick={() => {
                                setStoryLead(client);
                                setIsStoryModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
                              title="View Story"
                            >
                              <BookOpenText size={18} />
                            </button>
                          )}
                          {hasPermission("client_comments") && (
                            <button
                              onClick={() => {
                                setSelectedLeadId(client.lead_id);
                                setIsCommentModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
                              title="Comment"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // My Clients Table for other roles
          <>
            {!(role === "SUPERADMIN" || role === "BRANCH MANAGER") && (
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                {/* Tabs */}
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  {["self", "other"].map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        if (myView !== v) {
                          setMyView(v);
                          fetchMyClients(v);
                        }
                      }}
                      className={`px-4 py-2 text-sm font-medium border
            ${myView === v
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"}
            ${i === 0 ? "rounded-l-lg" : "rounded-r-lg"}`}
                    >
                      {v === "self" ? "My Clients" : "My team"}
                    </button>
                  ))}
                </div>

                {/* Date range + actions */}
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyDate}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
                  >
                    Apply
                  </button>
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm border"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}


            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>

                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Name",
                      "Email",
                      "Mobile",
                      "Investment",
                      "Services",
                      "Last Payment",
                      "Assigned",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(filteredMyClients) &&
                    filteredMyClients.map((client) => {
                      const services = parseServices(client);
                      const lastPaidAt = lastPaymentISO(client);
                      return (
                        <tr
                          key={client.lead_id}
                          className="align-top odd:bg-white even:bg-slate-50 hover:bg-blue-50/50 transition-colors"
                        >
                          {/* NAME */}
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            <span className="line-clamp-1">{client.full_name}</span>
                          </td>

                          {/* EMAIL */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span
                              className="block truncate max-w-[260px]"
                              title={client.email || ""}
                            >
                              {client.email || "—"}
                            </span>
                          </td>

                          {/* MOBILE */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className="whitespace-nowrap">
                              {client.mobile || "—"}
                            </span>
                          </td>

                          {/* INVESTMENT (₹) */}
                          <td className="px-4 py-3 text-sm font-medium text-green-600 rupee">
                            {typeof client.investment === "number"
                              ? `₹${client.investment}`
                              : typeof client.total_amount_paid === "number"
                                ? `₹${client.total_amount_paid}`
                                : "—"}
                          </td>

                          {/* SERVICES (scrollable) */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {services.length ? (
                              <div className="max-h-16 overflow-y-auto pr-1 thin-scroll">
                                <div className="flex flex-wrap gap-1">
                                  {services.map((service, idx) => (
                                    <span
                                      key={`${client.lead_id}-${idx}`}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      title={service}
                                    >
                                      <span className="max-w-[140px] truncate">
                                        {service}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* LAST PAYMENT (date) */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {lastPaidAt
                              ? new Date(lastPaidAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : "—"}
                          </td>

                          {/* ASSIGNED */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {client?.assigned_employee
                              ? `${client.assigned_employee.name || "—"} (${roleFromId(
                                client.assigned_employee.role_id
                              )})`
                              : "—"}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/lead/${client.lead_id}`)}
                                className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
                                title="Edit Lead"
                              >
                                <Eye size={18} />
                              </button>

                              <button
                                onClick={() => {
                                  setStoryLead(client);
                                  setIsStoryModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
                                title="View Story"
                              >
                                <BookOpenText size={18} />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedLeadId(client.lead_id);
                                  setIsCommentModalOpen(true);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
                                title="Comment"
                              >
                                <MessageCircle size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading &&
          ((role === "SUPERADMIN" || role === "BRANCH MANAGER")
            ? filteredClients.length === 0
            : filteredMyClients.length === 0) && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No clients found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {branchId
                  ? "Try selecting a different branch or date range."
                  : "Try changing the date range."}
              </p>
            </div>
          )}

        {/* Modals (lead_id FIXED) */}
        {isCommentModalOpen && (
          <CommentModal
            isOpen={isCommentModalOpen}
            onClose={() => setIsCommentModalOpen(false)}
            leadId={selectedLeadId}
          />
        )}
        {storyLead && isStoryModalOpen && (
          <StoryModal
            isOpen={isStoryModalOpen}
            onClose={() => setIsStoryModalOpen(false)}
            leadId={storyLead?.lead_id}
          />
        )}
        <InvoiceList
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          leadId={selectedLead?.lead_id}
        />
      </div>
    </div>
  );
}
