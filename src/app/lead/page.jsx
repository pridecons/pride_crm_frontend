"use client";

import { axiosInstance } from "@/api/Axios";
import LeadCommentSection from "@/components/Lead/LeadCommentSection";
import LoadingState from "@/components/LoadingState";
import { Pencil, Phone, MessageSquare, User, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

export default function NewLeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sources, setSources] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [editId, setEditId] = useState(null);
  const [userId, setUserId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [showFTModal, setShowFTModal] = useState(false);
  const [ftLead, setFTLead] = useState(null);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");

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
      const { data } = await axiosInstance.get("/leads/assignments/my");
      const items = data.assignments || [];

      const leadsWithIds = items.map((item) => ({
        ...item.lead,
        assignment_id: item.assignment_id,
        tempComment: "",
        showComments: false,
        fetchedComments: false,
        allComments: [], // to store fetched comment history
      }));

      setLeads(leadsWithIds);
      setTotal(data.total_count || leadsWithIds.length);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads!");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComments = async (leadId) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) => {
        if (lead.id === leadId) {
          if (!lead.fetchedComments) {
            // First time fetching comments
            axiosInstance
              .get(`/leads/${leadId}/comments`)
              .then((res) => {
                setLeads((updated) =>
                  updated.map((l) =>
                    l.id === leadId
                      ? {
                        ...l,
                        allComments: res.data || [],
                        showComments: true,
                        fetchedComments: true,
                      }
                      : l
                  )
                );
              })
              .catch((err) => {
                console.error("Error fetching comments:", err);
                toast.error("Failed to load comments");
              });
            return { ...lead, showComments: true }; // Temporary state change while loading
          } else {
            // Toggle visibility
            return { ...lead, showComments: !lead.showComments };
          }
        }
        return lead;
      })
    );
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

  // ✅ Fetch New Leads Button
  const handleFetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/leads/fetch");
      toast.success(`${data.fetched_count} new leads fetched`);
      await fetchLeads(); // refresh full table
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to fetch new leads!");
    } finally {
      setLoading(false);
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


  const filteredLeads = leads
    .filter((lead) => !lead.lead_response_id)
    .slice((page - 1) * limit, page * limit);
  const filteredtotal = leads.filter((lead) => !lead.lead_response_id).length;
  const totalPages = Math.ceil(total / limit);

  const renderFTModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Set FT Date Range</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={ftFromDate}
                onChange={(e) => setFTFromDate(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={ftToDate}
                onChange={(e) => setFTToDate(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setShowFTModal(false)}
              className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
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
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleFetchLeads}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Download size={16} /> Fetch Leads
        </button>
      </div>

      <div className="bg-white rounded-xl border-b border-gray-200 max-w-7xl mx-auto overflow-hidden">

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
                    "Owner",
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

                    {/* Owner */}
                    <td className="px-4 py-3">{lead.created_by_name}</td>

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
                        const responseName = responses.find((r) => r.id === lead.lead_response_id)?.name?.toLowerCase() || "";
                        if (responseName === "ft") {
                          return (
                            <div className="flex flex-col gap-1 text-xs text-gray-700">
                              <div className="flex justify-between items-center">
                                <span><strong>From:</strong> {lead.ft_from_date || "N/A"}</span>
                                <button
                                  className="text-blue-600 hover:underline text-[11px]"
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
                              <div>
                                <strong>To:</strong> {lead.ft_to_date || "N/A"}
                              </div>
                              <div className="text-green-600 italic">
                                {lead.comment || "FT assigned"}
                              </div>
                            </div>
                          );
                        }
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredtotal)} of {filteredtotal} entries
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

      {showFTModal && renderFTModal()}


    </div>
  );

}