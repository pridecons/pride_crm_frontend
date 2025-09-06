"use client";

import { axiosInstance } from "@/api/Axios";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import { Pencil, BookOpenText, MessageCircle, Download, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import LeadsDataTable from "@/components/Lead/LeadsTable";
import { formatCallbackForAPI, isoToDatetimeLocal } from "@/utils/dateUtils";
import { ErrorHandling } from "@/helper/ErrorHandling";
import CallButton from "@/components/Lead/CallButton";

export default function NewLeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sources, setSources] = useState([]);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

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

  // 📌 assignment meta from /leads/assignments/my
  const [assignmentMeta, setAssignmentMeta] = useState({
    can_fetch_new: true,
    last_fetch_limit: null,
    assignment_ttl_hours: null,
    total_count: null,
  });

  const router = useRouter();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
    setUserId(userInfo.employee_code || "Admin001");
  }, []);

  // 1) On first render: check current assignments
  useEffect(() => {
    initLoad();
  }, []);

  const initLoad = async () => {
    await fetchLeads();     // ← first call: /leads/assignments/my
    fetchResponses();
    fetchSources();
  };

  // GET /leads/assignments/my
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/leads/assignments/my");
      const items = Array.isArray(data.assignments) ? data.assignments : [];

      const leadsWithIds = items.map((item) => ({
        ...item.lead,
        assignment_id: item.assignment_id,
        tempComment: "",
        showComments: false,
        fetchedComments: false,
        allComments: [],
      }));

      setLeads(leadsWithIds);
      setAssignmentMeta({
        can_fetch_new: !!data.can_fetch_new,
        last_fetch_limit: data.last_fetch_limit ?? null,
        assignment_ttl_hours: data.assignment_ttl_hours ?? null,
        total_count: data.total_count ?? null,
      });
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to load leads!" });
    } finally {
      setLoading(false);
    }
  };

  // 2) POST /leads/fetch (only when clicking button), then refresh assignments
  const handleFetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/leads/fetch");

      // Friendly messaging
      if (data.fetched_count === 0 && /active assignments/i.test(data?.message || "")) {
        ErrorHandling({
          defaultError:
            "No leads available at the moment. Complete active assignments before fetching new ones.",
        });
      } else {
        toast.success(`${data.fetched_count ?? 0} new leads fetched`);
      }

      // 3) Refresh current assignments after fetching
      await fetchLeads();
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to fetch new leads!" });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/responses/", {
        params: { skip: 0, limit: 100 },
      });
      setResponses(data || []);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get("/lead-config/sources/", {
        params: { skip: 0, limit: 100 },
      });
      setSources(data || []);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const handleSaveComment = async (lead) => {
    if (!userId) return ErrorHandling({ defaultError: "User not loaded!" });
    if (!lead.tempComment || !lead.tempComment.trim())
      return ErrorHandling({ defaultError: "Comment cannot be empty!" });

    try {
      const { data } = await axiosInstance.post(
        `/leads/${lead.id}/comments`,
        null,
        { params: { comment: lead.tempComment } }
      );
      toast.success("Comment saved!");
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, comment: data.comment, tempComment: "" } : l))
      );
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to save comment!" });
    }
  };

  const handleUpdateName = async (lead) => {
    try {
      await axiosInstance.put(`/leads/${lead.id}`, lead);
      toast.success("Lead updated successfully!");
      setEditId(null);
    } catch (error) {
      ErrorHandling({ error, defaultError: "Update failed!" });
    }
  };

  // 🔁 Response change (FT / Callback / others)
  const handleResponseChange = async (lead, newResponseId) => {
    const selected = responses.find((r) => r.id == newResponseId);
    const responseName = selected?.name?.toLowerCase();

    if (responseName === "ft") {
      setFTLead(lead);
      setFTFromDate("");
      setFTToDate("");
      setShowFTModal(true);
      return;
    }

    if (responseName === "call back" || responseName === "callback") {
      setCallBackLead(lead);
      setCallBackDate(isoToDatetimeLocal(lead.call_back_date || ""));
      setShowCallBackModal(true);
      return;
    }

    try {
      await axiosInstance.patch(`/leads/${lead.id}/response`, {
        lead_response_id: parseInt(newResponseId, 10),
      });
      toast.success("Response updated!");
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, lead_response_id: parseInt(newResponseId, 10) } : l))
      );
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to update response!" });
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Client Name",
        render: (lead) =>
          editId === lead.id ? (
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
          ),
      },
      { header: "Mobile", render: (lead) => lead.mobile },
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
            <CallButton lead={lead} onRefresh={fetchLeads} />
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
    ],
    [editId, responses, sources, router]
  );

  const filteredLeads = useMemo(() => leads.filter((l) => !l.lead_response_id), [leads]);
  const paginatedLeads = useMemo(
    () => filteredLeads.slice((page - 1) * limit, page * limit),
    [filteredLeads, page, limit]
  );

  return (
    <div className="min-h-screen p-4">
      {/* Assignment status bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Info size={16} />
          <span>
            {assignmentMeta.can_fetch_new
              ? "You can fetch new leads."
              : "Active leads present — complete them to fetch new leads."}
          </span>
          {assignmentMeta.last_fetch_limit != null && (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
              Last fetch limit: {assignmentMeta.last_fetch_limit}
            </span>
          )}
          {assignmentMeta.assignment_ttl_hours != null && (
            <span className="ml-2 inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
              TTL: {assignmentMeta.assignment_ttl_hours}h
            </span>
          )}
        </div>

        <button
          onClick={handleFetchLeads}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg shadow transition
     ${loading ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}
   `}
          title={
            assignmentMeta.can_fetch_new
              ? "Fetch new leads"
              : "You have active assignments; finish them to enable fetching."
          }
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
          total={filteredLeads.length}
          onPageChange={setPage}
        />
      </div>

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

      <FTModal
        open={showFTModal}
        onClose={() => setShowFTModal(false)}
        onSave={async () => {
          if (!ftFromDate || !ftToDate) return ErrorHandling({ defaultError: "Both dates required" });
          try {
            const ftId = responses.find((r) => r.name.toLowerCase() === "ft")?.id;
            await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
              lead_response_id: ftId,
              ft_from_date: ftFromDate.split("-").reverse().join("-"),
              ft_to_date: ftToDate.split("-").reverse().join("-"),
            });
            toast.success("FT response and dates saved!");
            setLeads((prev) =>
              prev.map((l) =>
                l.id === ftLead.id
                  ? {
                    ...l,
                    lead_response_id: ftId,
                    ft_from_date: ftFromDate.split("-").reverse().join("-"),
                    ft_to_date: ftToDate.split("-").reverse().join("-"),
                  }
                  : l
              )
            );
            setShowFTModal(false);
          } catch (err) {
            ErrorHandling({ error: err, defaultError: "Failed to save FT response" });
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
          if (!callBackDate) return ErrorHandling({ defaultError: "Call back date is required" });
          try {
            const cbId = responses.find((r) => {
              const n = r.name.toLowerCase();
              return n === "call back" || n === "callback";
            })?.id;

            await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
              lead_response_id: cbId,
              call_back_date: formatCallbackForAPI(callBackDate),
            });

            const savedISO = formatCallbackForAPI(callBackDate);
            setLeads((prev) =>
              prev.map((l) =>
                l.id === callBackLead.id ? { ...l, lead_response_id: cbId, call_back_date: savedISO } : l
              )
            );

            toast.success("Call Back response and date saved!");
            setShowCallBackModal(false);
          } catch (err) {
            ErrorHandling({ error: err, defaultError: "Failed to save Call Back response" });
          }
        }}
        dateValue={callBackDate}
        setDateValue={setCallBackDate}
      />
    </div>
  );
}
