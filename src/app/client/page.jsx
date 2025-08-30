"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import InvoiceList from "@/components/Lead/InvoiceList";
import { Pencil, FileText, BookOpenText, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/context/PermissionsContext";

// --- role helpers ------------------------------------------------------------
const normalizeRoleKey = (r) => {
  const key = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "SUPER_ADMINISTRATOR") return "SUPERADMIN";
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
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
  if (Array.isArray(client?.latest_payment?.service) && client.latest_payment.service.length > 0) {
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
    } catch (_) { /* ignore parse errors */ }
  }

  return [];
};

const lastPaymentISO = (client) =>
  client?.latest_payment?.created_at || null;

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

  const router = useRouter();

  // initialize role/branch + fetch correct client list
  useEffect(() => {
    const { role: r, branch_id: b } = getUserMeta();
    setRole(r);
    setBranchId(b);

    if (r === "SUPERADMIN") {
      fetchBranches();
      fetchClients(); // all branches
    } else if (r === "BRANCH MANAGER") {
      fetchClients(b); // only this branch
    } else {
      fetchMyClients(); // only my clients (FIXED endpoint)
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

  const fetchClients = async (branch = null) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/clients/?page=1&limit=100${branch ? `&branch_id=${branch}` : ""}`
      );
      // some backends return data directly or { clients: [...] }
      const list = Array.isArray(res.data) ? res.data : res.data?.clients;
      setClients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClients = async () => {
    try {
      setLoading(true);
      // ✅ FIX: correct endpoint to avoid 404 (as per your cURL)
      const res = await axiosInstance.get("/clients/my/clients?page=1&limit=50");
      setMyClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
    } catch (err) {
      console.error("Error fetching my clients:", err);
      setMyClients([]);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="flex">
            <span className="text-gray-500 w-24">KYC:</span>
            <span
              className={`text-sm font-medium ${
                client.kyc_status ? "text-green-600" : "text-red-600"
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
              <p className="text-lg font-semibold text-green-600">
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
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                      !branchId
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
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                          isActive
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

            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium border ${
                  view === "card"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                } border-gray-300 rounded-l-lg`}
                onClick={() => setView("card")}
              >
                Card View
              </button>
              <button
                type="button"
                className={`px-4 py-3 text-sm font-medium border ${
                  view === "table"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                } border-gray-300 rounded-r-lg`}
                onClick={() => setView("table")}
              >
                Table View
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading Clients..." />
        ) : (role === "SUPERADMIN" || role === "BRANCH MANAGER") ? (
          view === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => renderClientCard(client))}
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
                  {clients.map((client) => (
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
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`${
                            client.kyc_status
                              ? "text-green-600 font-semibold"
                              : "text-red-600"
                          }`}
                        >
                          {client.kyc_status ? "DONE" : "PENDING"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        ₹{client.total_amount_paid ?? 0}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex items-center gap-1.5">
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
                {Array.isArray(myClients) &&
                  myClients.map((client) => {
                    const services = parseServices(client);
                    const lastPaidAt = lastPaymentISO(client);
                    return (
                      <tr key={client.lead_id} className="align-top">
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
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {typeof client.investment === "number"
                            ? `₹${client.investment}`
                            : typeof client.total_amount_paid === "number"
                            ? `₹${client.total_amount_paid}`
                            : "—"}
                        </td>

                        {/* SERVICES */}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {services.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {services.map((service, idx) => (
                                <span
                                  key={`${client.lead_id}-${idx}`}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                  title={service}
                                >
                                  <span className="max-w-[120px] truncate">
                                    {service}
                                  </span>
                                </span>
                              ))}
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

                        {/* ACTIONS */}
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(`/lead/${client.lead_id}`)
                              }
                              className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
                              title="Edit Lead"
                            >
                              <Pencil size={14} />
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
        )}

        {/* Empty State */}
        {!loading &&
          ((role === "SUPERADMIN" || role === "BRANCH MANAGER")
            ? clients.length === 0
            : myClients.length === 0) && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 4 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No clients found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {branchId
                  ? "Try selecting a different branch."
                  : "Get started by adding your first client."}
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
