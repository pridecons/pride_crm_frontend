"use client";

import { axiosInstance } from "@/api/Axios";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import LeadCommentSection from "@/components/Lead/LeadCommentSection";
import LoadingState from "@/components/LoadingState";
import { Pencil, Phone, MessageSquare, User, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

export default function OldLeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sources, setSources] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [editId, setEditId] = useState(null);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);
  const [activeResponseId, setActiveResponseId] = useState(null);
  const [fullScreenDocUrl, setFullScreenDocUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFTModal, setShowFTModal] = useState(false);
  const [ftLead, setFTLead] = useState(null);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");
  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackLead, setCallBackLead] = useState(null);
  const [callBackDate, setCallBackDate] = useState("");

  const router = useRouter();

  // ✅ Load user info for comments
  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user_info")) || {};
    setUserId(userInfo.employee_code || "Admin001");
  }, []);

  // ✅ Fetch data on mount
  useEffect(() => {
    fetchLeads();
    fetchResponses();
    fetchSources();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // ⬇️ Use the new endpoint
      const { data } = await axiosInstance.get("/old-leads/my-assigned");
      const items = data.assigned_old_leads || [];

      // No filter on lead_response_id here, as old leads always have a response
      setLeads(items);
      setTotal(items.length);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads!");
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/responses/", { params: { skip: 0, limit: 100 } });
      setResponses(data);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/sources/", { params: { skip: 0, limit: 100 } });
      setSources(data);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };


  // ✅ Save comment
  const handleSaveComment = async (lead) => {
    if (!userId) {
      toast.error("User not loaded!");
      return;
    }

    if (!lead.tempComment || !lead.tempComment.trim()) {
      toast.error("Comment cannot be empty!");
      return;
    }

    try {
      const { data } = await axiosInstance.post(
        `/leads/${lead.id}/comments`,
        null, // no body
        {
          params: { comment: lead.tempComment },
        }
      );

      toast.success("Comment saved!");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, comment: data.comment, tempComment: "" } : l
        )
      );
    } catch (error) {
      console.error("Error saving comment:", error);
      toast.error("Failed to save comment!");
    }
  };

  // ✅ Update name
  const handleUpdateName = async (lead) => {
    try {
      await axiosInstance.put(`/leads/${lead.id}`, lead);
      toast.success("Lead updated successfully!");
      setEditId(null);
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Update failed!");
    }
  };

  // ✅ Update response & move lead to Old Leads
  const handleResponseChange = async (lead, newResponseId) => {
    const selectedResponse = responses.find((r) => r.id == newResponseId);
    const responseName = selectedResponse?.name?.toLowerCase();

    if (responseName === "ft") {
      // open modal for FT date input
      setFTLead(lead);
      setFTFromDate("");
      setFTToDate("");
      setShowFTModal(true);
    } else {
      // Non-FT response, update directly
      try {
        await axiosInstance.patch(`/leads/${lead.id}/response`, {
          lead_response_id: parseInt(newResponseId),
        });

        toast.success("Response updated!");
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, lead_response_id: parseInt(newResponseId) } : l
          )
        );

        setActiveTab("Old Leads");
      } catch (error) {
        console.error("Error updating response:", error);
        toast.error("Failed to update response!");
      }
    }
  };


  const getValidFTDates = () => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };


  // ✅ Pagination
  const totalPages = Math.ceil(total / limit);
  const paginatedLeads = leads.slice((page - 1) * limit, page * limit);

  // ✅ Filter based on tab
  const responseNameMap = useMemo(
    () => Object.fromEntries(responses.map((r) => [r.id, r.name.toLowerCase()])),
    [responses]
  );

  const filteredLeads = paginatedLeads.filter(
    (lead) => activeResponseId === null || lead.lead_response_id === activeResponseId
  );

  function isFTOver(ftToDate) {
    if (!ftToDate) return false;

    // Normalize both to YYYY-MM-DD
    let ftToISO;
    if (/^\d{4}-\d{2}-\d{2}$/.test(ftToDate)) {
      ftToISO = ftToDate;
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(ftToDate)) {
      const [dd, mm, yyyy] = ftToDate.split("-");
      ftToISO = `${yyyy}-${mm}-${dd}`;
    } else {
      return false;
    }

    // Today's date as YYYY-MM-DD
    const todayISO = new Date();
    const yyyy = todayISO.getFullYear();
    const mm = String(todayISO.getMonth() + 1).padStart(2, "0");
    const dd = String(todayISO.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // FT is over if FT 'to' date < today
    return ftToISO < todayStr;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 ">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-7xl mx-auto overflow-hidden">
        {/* ✅ Top Bar */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {/* Dynamic Tabs including ALL */}
            <button
              onClick={() => setActiveResponseId(null)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeResponseId === null
                ? "bg-green-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              ALL
            </button>

            {responses.map((response) => (
              <button
                key={response.id}
                onClick={() => setActiveResponseId(response.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeResponseId === response.id
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {response.name}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Table Container */}
        {loading ? (
          <LoadingState message="Loading leads..." />
        ) : (

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white sticky top-0 z-10">
                <tr>
                  {[
                    "S.No.",
                    "Lead ID",
                    "Client Name",
                    "Mobile",
                    "Response",
                    "Comment",
                    "Source",
                    "Actions",
                  ].map((header, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 font-semibold uppercase tracking-wide text-xs"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                  >
                    {/* S.No */}
                    <td className="px-4 py-3 font-medium">{(page - 1) * limit + index + 1}</td>

                    {/* Lead ID */}
                    <td className="px-4 py-3">{lead.id}</td>

                    {/* Client Name */}
                    <td className="px-4 py-3">
                      {editId === lead.id ? (
                        <input
                          type="text"
                          value={lead.full_name}
                          onChange={(e) =>
                            setLeads((prev) =>
                              prev.map((l) => (l.id === lead.id ? { ...l, full_name: e.target.value } : l))
                            )
                          }
                          onBlur={() => handleUpdateName(lead)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 text-sm"
                        />
                      ) : (
                        <span>{lead.full_name}</span>
                      )}
                    </td>

                    {/* Mobile */}
                    <td className="px-4 py-3">{lead.mobile}</td>

                    {/* Response */}
                    <td className="px-4 py-3">
                      {(() => {
                        const responseName = responseNameMap[lead.lead_response_id] || "";
                        const showResponseDropdown = true; // Always show dropdown for all rows

                        // FT details with Edit button
                        if (responseName === "ft") {
                          return (
                            <div className="flex flex-col gap-1 text-xs text-gray-700">
                              <div className="flex items-center justify-between">
                                <div>
                                  <strong>From:</strong> {lead.ft_from_date || "N/A"}
                                  {"  "}
                                  <strong>To:</strong> {lead.ft_to_date || "N/A"}
                                </div>
                                <button
                                  className="text-blue-600 hover:underline text-[11px] ml-3"
                                  onClick={() => {
                                    setFTLead(lead);
                                    setFTFromDate(lead.ft_from_date?.split("-").reverse().join("-") || "");
                                    setFTToDate(lead.ft_to_date?.split("-").reverse().join("-") || "");
                                    setShowFTModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                              {/* --- Always show the response dropdown even for FT: --- */}
                              {showResponseDropdown && (
                                <select
                                  className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-400"
                                  value={lead.lead_response_id || ""}
                                  onChange={(e) => handleResponseChange(lead, e.target.value)}
                                >
                                  <option value="">Select Response</option>
                                  {responses.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <div className={`italic ${isFTOver(lead.ft_to_date) ? "text-red-600" : "text-green-600"}`}>
                                {isFTOver(lead.ft_to_date)
                                  ? "FT Over"
                                  : (lead.comment || "FT assigned")}
                              </div>
                            </div>
                          );
                        }

                        // Call Back details with Edit button
                        if (responseName === "call back" || responseName === "callback") {
                          return (
                            <div className="flex flex-col gap-1 text-xs text-gray-700">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium">
                                  <strong>Call Back Date:</strong>{" "}
                                  {lead.call_back_date
                                    ? new Date(lead.call_back_date).toLocaleString()
                                    : "N/A"}
                                </span>
                                <button
                                  className="text-blue-600 hover:underline text-[11px]"
                                  onClick={() => {
                                    setCallBackLead(lead);
                                    // If there's a call_back_date, format for datetime-local input
                                    let inputDate = "";
                                    if (lead.call_back_date) {
                                      const dt = new Date(lead.call_back_date);
                                      const yyyy = dt.getFullYear();
                                      const mm = String(dt.getMonth() + 1).padStart(2, "0");
                                      const dd = String(dt.getDate()).padStart(2, "0");
                                      const hh = String(dt.getHours()).padStart(2, "0");
                                      const min = String(dt.getMinutes()).padStart(2, "0");
                                      inputDate = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
                                    }
                                    setCallBackDate(inputDate);
                                    setShowCallBackModal(true);
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                              {/* --- Always show the response dropdown even for Call Back: --- */}
                              {showResponseDropdown && (
                                <select
                                  className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-400"
                                  value={lead.lead_response_id || ""}
                                  onChange={(e) => handleResponseChange(lead, e.target.value)}
                                >
                                  <option value="">Select Response</option>
                                  {responses.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        }

                        // For all other responses
                        return (
                          <select
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-400"
                            value={lead.lead_response_id || ""}
                            onChange={(e) => handleResponseChange(lead, e.target.value)}
                          >
                            <option value="">Select Response</option>
                            {responses.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>

                    {/* Comment */}
                    <td className="px-4 py-3">
                      <LeadCommentSection
                        leadId={lead.id}
                        tempComment={lead.tempComment || ""}
                        savedComment={lead.comment}
                        onCommentChange={(val) =>
                          setLeads((prev) =>
                            prev.map((l) =>
                              l.id === lead.id ? { ...l, tempComment: val } : l
                            )
                          )
                        }
                        onSave={() => handleSaveComment(lead)}
                      />
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded">
                        {sources.find((s) => s.id === lead.lead_source_id)?.name || "N/A"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center ">
                      <button
                        onClick={() => router.push(`/lead/${lead.id}`)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
                        title="Edit lead"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </span>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className={`px-4 py-2 rounded-lg border transition ${page === 1
                ? "border-gray-200 text-gray-400"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Previous
            </button>
            <span className="text-gray-700">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={`px-4 py-2 rounded-lg border transition ${page === totalPages
                ? "border-gray-200 text-gray-400"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <FTModal
        open={showFTModal}
        onClose={() => setShowFTModal(false)}
        onSave={async () => {
          if (!ftFromDate || !ftToDate) {
            toast.error("Both dates required");
            return;
          }
          try {
            await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
              lead_response_id: responses.find((r) => r.name.toLowerCase() === "ft")?.id,
              ft_from_date: ftFromDate.split("-").reverse().join("-"),
              ft_to_date: ftToDate.split("-").reverse().join("-"),
            });
            toast.success("FT response and dates saved!");
            setLeads((prev) =>
              prev.map((l) =>
                l.id === ftLead.id
                  ? {
                    ...l,
                    lead_response_id: responses.find((r) => r.name.toLowerCase() === "ft")?.id,
                    ft_from_date: ftFromDate.split("-").reverse().join("-"),
                    ft_to_date: ftToDate.split("-").reverse().join("-"),
                  }
                  : l
              )
            );
            setShowFTModal(false);
          } catch (err) {
            console.error(err);
            toast.error("Failed to save FT response");
          }
        }}
        fromDate={ftFromDate}
        toDate={ftToDate}
        setFromDate={setFTFromDate}
        setToDate={setFTToDate}
      />
      <CallBackModal
        open={showCallBackModal}
        onClose={() => setShowCallBackModal(false)}
        onSave={async () => {
          if (!callBackDate) {
            toast.error("Call back date is required");
            return;
          }
          try {
            await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
              lead_response_id: responses.find(
                (r) => r.name.toLowerCase() === "call back" || r.name.toLowerCase() === "callback"
              )?.id,
              call_back_date: new Date(callBackDate).toISOString(),
            });
            toast.success("Call Back response and date saved!");
            setLeads((prev) =>
              prev.map((l) =>
                l.id === callBackLead.id
                  ? {
                    ...l,
                    lead_response_id: responses.find(
                      (r) => r.name.toLowerCase() === "call back" || r.name.toLowerCase() === "callback"
                    )?.id,
                    call_back_date: callBackDate,
                  }
                  : l
              )
            );
            setShowCallBackModal(false);
          } catch (err) {
            console.error(err);
            toast.error("Failed to save Call Back response");
          }
        }}
        dateValue={callBackDate}
        setDateValue={setCallBackDate}
      />

    </div>
  );

}