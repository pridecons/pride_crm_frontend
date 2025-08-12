"use client";

import { axiosInstance } from "@/api/Axios";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import LeadCommentSection from "@/components/Lead/LeadCommentSection";
import LoadingState from "@/components/LoadingState";
import { Pencil, BookOpenText, MessageCircle, Eye, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import LeadsDataTable from "@/components/Lead/LeadsTable";

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

  const columns = [
    {
      header: "Client Name",
      render: (lead) =>
        editId === lead.id ? (
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
        ),
    },
    {
      header: "Mobile",
      render: (lead) => lead.mobile,
    },
    {
      header: "Response",
      render: (lead) => (
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
      ),
    },
    {
      header: "Source",
      render: (lead) => (
        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded">
          {sources.find((s) => s.id === lead.lead_source_id)?.name || "N/A"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (lead) => (
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/lead/${lead.id}`)}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow"
            title="Edit lead"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              setStoryLead(lead);
              setIsStoryModalOpen(true);
            }}
            className="w-8 h-8 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow"
            title="View Story"
          >
            <BookOpenText size={18} />
          </button>
          <button
            onClick={() => {
              setSelectedLeadId(lead.id);
              setIsCommentModalOpen(true);
            }}
            className="w-8 h-8 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center shadow"
            title="Comments"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Filter and paginate as before
  const filteredLeads = leads.filter((l) => !l.lead_response_id);
  const filteredTotal = filteredLeads.length;
  const paginatedLeads = filteredLeads.slice((page - 1) * limit, page * limit);

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
        <LeadsDataTable
          leads={paginatedLeads}
          loading={loading}
          columns={columns}
          page={page}
          limit={limit}
          total={filteredTotal}
          onPageChange={setPage}
        />
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