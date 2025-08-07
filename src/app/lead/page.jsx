"use client";

import { axiosInstance } from "@/api/Axios";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import LeadCommentSection from "@/components/Lead/LeadCommentSection";
import LoadingState from "@/components/LoadingState";
import { Pencil,BookOpenText, MessageCircle, Eye, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLead, setStoryLead] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
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
      const { data } = await axiosInstance.get("/lead-config/responses/", {
        params: { skip: 0, limit: 100 },
      });
      setResponses(data);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/sources/", {
        params: { skip: 0, limit: 100 },
      });
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
    if (!userId) return toast.error("User not loaded!");
    if (!lead.tempComment || !lead.tempComment.trim())
      return toast.error("Comment cannot be empty!");

    try {
      const { data } = await axiosInstance.post(
        `/leads/${lead.id}/comments`,
        null,
        { params: { comment: lead.tempComment } }
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

  const handleResponseChange = async (lead, newResponseId) => {
    const selectedResponse = responses.find((r) => r.id == newResponseId);
    const responseName = selectedResponse?.name?.toLowerCase();

    if (responseName === "ft") {
      setFTLead(lead);
      setFTFromDate("");
      setFTToDate("");
      setShowFTModal(true);
    } else if (responseName === "call back" || responseName === "callback") {
      setCallBackLead(lead);
      setCallBackDate("");
      setShowCallBackModal(true);
    } else {
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

  const filteredLeads = leads
    .filter((lead) => !lead.lead_response_id)
    .slice((page - 1) * limit, page * limit);
  const filteredtotal = leads.filter((lead) => !lead.lead_response_id).length;
  const totalPages = Math.ceil(total / limit);

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
        {loading ? (
          <LoadingState message="Loading leads..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white sticky top-0 z-10">
                <tr>
                  {["Client Name", "Mobile", "Response", "Source", "Actions"].map(
                    (header, i) => (
                      <th key={i} className="px-4 py-3 font-semibold uppercase tracking-wide text-xs">
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                  >

                    {/* Client Name */}
                    <td className="px-4 py-3">
                      {editId === lead.id ? (
                        <input
                          type="text"
                          value={lead.full_name}
                          onChange={(e) =>
                            setLeads((prev) =>
                              prev.map((l) =>
                                l.id === lead.id ? { ...l, full_name: e.target.value } : l
                              )
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
                    </td>

                    {/* Comment */}
                    {/* <td className="px-4 py-3">
                      <LeadCommentSection
                        leadId={lead.id}
                        tempComment={lead.tempComment || ""}
                        savedComment={lead.comment}
                        onCommentChange={(val) =>
                          setLeads((prev) =>
                            prev.map((l) => (l.id === lead.id ? { ...l, tempComment: val } : l))
                          )
                        }
                        onSave={() => handleSaveComment(lead)}
                      />
                    </td> */}


                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded">
                        {sources.find((s) => s.id === lead.lead_source_id)?.name || "N/A"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center ">
                      <div className="flex gap-1">
                        <div>
                          <button
                            onClick={() => router.push(`/lead/${lead.id}`)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow transition"
                            title="Edit lead"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              setStoryLead(lead);
                              setIsStoryModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 bg-gray-500 text-white hover:bg-green-600 rounded-full shadow transition"
                            aria-label="View Story"
                          >
                            <BookOpenText size={18} />
                          </button>

                        </div>
                        <div>
                          <button
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setIsCommentModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8  bg-teal-500 text-white rounded-full hover:bg-teal-600 shadow transition"
                            title="Comments"
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>

                      </div>
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
              className={`px-4 py-2 rounded-lg border transition ${page === 1 ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Previous
            </button>
            <span className="text-gray-700">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className={`px-4 py-2 rounded-lg border transition ${page === totalPages ? "border-gray-200 text-gray-400" : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Correctly Placed Modal */}
      {storyLead && (
        <StoryModal
          isOpen={isStoryModalOpen}
          onClose={() => setIsStoryModalOpen(false)}
          leadId={storyLead.id}
        />
      )}

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        leadId={selectedLeadId}
      />


      {/* ✅ FT Modal */}
      <FTModal
        open={showFTModal}
        onClose={() => setShowFTModal(false)}
        onSave={async () => {
          if (!ftFromDate || !ftToDate) return toast.error("Both dates required");
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
          if (!callBackDate) return toast.error("Call back date is required");
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