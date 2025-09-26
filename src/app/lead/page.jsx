"use client";

import { axiosInstance } from "@/api/Axios";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import { Pencil, BookOpenText, MessageCircle, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import LeadsDataTable from "@/components/Lead/LeadsTable";
import { formatCallbackForAPI, isoToDatetimeLocal } from "@/utils/dateUtils";
import { ErrorHandling } from "@/helper/ErrorHandling";
import CallButton from "@/components/Lead/CallButton";
import FetchLeadsModal from "@/components/Lead/FetchLeadsModal";

export default function NewLeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);

  const [page, setPage] = useState(1);
  const limit = 50;

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

  const [ftServiceType, setFTServiceType] = useState("CALL");

  const [showFetchModal, setShowFetchModal] = useState(false);

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

  // Shows "local@….." if email is long; keeps full value for title/hover
  const shortEmail = (email) => {
    const raw = String(email || "").trim();
    if (!raw) return "";
    if (raw.length <= 28) return raw;
    const at = raw.indexOf("@");
    if (at === -1) return raw.slice(0, 18) + "…..";
    const local = raw.slice(0, at);
    return `${local}@…..`;
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

  const handleUpdateName = async (lead, nameRaw) => {
    const name = (nameRaw || "").trim();

    // add-only: if empty, or if name already existed, just exit
    if (!name) {
      setEditId(null);
      return;
    }
    if ((lead.full_name || "").trim()) {   // already had a name -> do nothing
      setEditId(null);
      return;
    }

    try {
      await axiosInstance.put(`/leads/${lead.id}`, { ...lead, full_name: name });
      // update UI immediately
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, full_name: name } : l))
      );
      toast.success("Lead updated successfully!");
    } catch (error) {
      ErrorHandling({ error, defaultError: "Update failed!" });
    } finally {
      setEditId(null);
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
      setFTServiceType(lead.ft_service_type || "CALL");
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
        render: (lead) => {
          const hasName = (lead.full_name || "").trim() !== "";
          return editId === lead.id ? (
            <input
              key={`edit-${lead.id}`}
              type="text"
              autoFocus
              defaultValue={lead.full_name || ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur(); // save on Enter
              }}
              onBlur={(e) => handleUpdateName(lead, e.currentTarget.value)} // <-- pass typed value
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 text-sm"
            />
          ) : hasName ? (
            // already has a name -> not clickable, no API
            <span className="truncate text-gray-900" title={lead.full_name}>
              {lead.full_name}
            </span>
          ) : (
            // empty -> add-only affordance (click to start)
            <span
              onClick={() => setEditId(lead.id)}
              className="truncate cursor-pointer text-gray-400 italic"
              title="Click to add name"
            >
              — Click to add name
            </span>
          );
        },
      },

      { header: "Mobile", render: (lead) => lead.mobile },

      // 🔹 NEW: Email column
      {
        header: "Email",
        align: "left",
        render: (lead) =>
          lead.email ? (
            <span
              className="inline-block max-w-[180px] md:max-w-[240px] truncate align-middle"
              title={lead.email}                     // <-- hover shows full email
            >
              {shortEmail(lead.email)}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },

      {
        header: "Response",
        render: (lead) => (
          <select
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
  render: (lead) => {
    const label =
      (lead.lead_source_name || "").trim() ||
      (lead.lead_source_id ? `ID ${lead.lead_source_id}` : "N/A");

    return (
      <span
        className="inline-block bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded"
        title={label}
      >
        {label}
      </span>
    );
  },
},
      {
        header: "Actions",
        render: (lead) => (
          <div className="flex gap-2">
            <CallButton lead={lead} onRefresh={fetchLeads} />

            <button
              onClick={() => router.push(`/lead/${lead.id}`)}
              title="Edit lead"
              className="group w-8 h-8 inline-flex items-center justify-center rounded-full text-blue-500 hover:text-blue-700 transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <Pencil
                size={22}
                className="transition-transform duration-150 group-hover:scale-110"
              />
            </button>

            <button
              onClick={() => {
                setStoryLead(lead);
                setIsStoryModalOpen(true);
              }}
              title="View Story"
              className="group w-8 h-8 inline-flex items-center justify-center rounded-full text-purple-500 hover:text-purple-700 transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <BookOpenText
                size={22}
                className="transition-transform duration-150 group-hover:scale-110"
              />
            </button>

            <button
              onClick={() => {
                setSelectedLeadId(lead.id);
                setIsCommentModalOpen(true);
              }}
              title="Comments"
              className="group w-8 h-8 inline-flex items-center justify-center rounded-full text-teal-500 hover:text-teal-700 transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <MessageCircle
                size={22}
                className="transition-transform duration-150 group-hover:scale-110"
              />
            </button>
          </div>
        ),
      }
    ],
    [editId, responses, router]
  );

  const filteredLeads = useMemo(() => leads.filter((l) => !l.lead_response_id), [leads]);
  const paginatedLeads = useMemo(
    () => filteredLeads.slice((page - 1) * limit, page * limit),
    [filteredLeads, page, limit]
  );

  return (
    <div className="fixed top-16 right-0 bottom-0 left-[var(--sbw)] transition-[left] duration-200
             p-4 overflow-hidden flex flex-col">
      {/* Assignment status bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end mb-4">
        <button
          onClick={() => setShowFetchModal(true)}   // ⬅️ open modal instead
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

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 mx-2 overflow-hidden flex flex-col">
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
        onSave={async (payload) => {
          try {
            const ftId = responses.find((r) => r.name.toLowerCase() === "ft")?.id;
            await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
              lead_response_id: ftId,
              ...payload, // <- includes ft_from_date, ft_to_date, segment, ft_service_type
            });
            toast.success("FT response saved!");
            // optional: reflect in table immediately
            setLeads((prev) =>
              prev.map((l) =>
                l.id === ftLead.id ? { ...l, lead_response_id: ftId, ...payload } : l
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
        serviceType={ftServiceType}              // <- pass through
        setServiceType={setFTServiceType}
        serviceTypeOptions={["CALL", "SMS"]}
      />

      <FetchLeadsModal
        open={showFetchModal}
        onClose={() => setShowFetchModal(false)}
        onFetched={async (result) => {
          // result.message / result.fetched_count / result.leads / result.usage
          // Re-load assignments so new leads appear in your table
          await fetchLeads();
          setShowFetchModal(false);
        }}
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
