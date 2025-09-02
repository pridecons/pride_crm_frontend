"use client";

import { axiosInstance } from "@/api/Axios";
import CallBackModal from "@/components/Lead/CallBackModal";
import CommentModal from "@/components/Lead/CommentModal";
import FTModal from "@/components/Lead/FTModal";
import LeadsDataTable from "@/components/Lead/LeadsTable";
import StoryModal from "@/components/Lead/StoryModal";
import { Pencil, BookOpenText, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
// ✨ IST-safe helpers — same ones used on the Lead page
import { formatCallbackForAPI, isoToDatetimeLocal, toIST } from "@/utils/dateUtils";

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
  const [loading, setLoading] = useState(false);

  const [showFTModal, setShowFTModal] = useState(false);
  const [ftLead, setFTLead] = useState(null);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");

  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackLead, setCallBackLead] = useState(null);
  const [callBackDate, setCallBackDate] = useState("");

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLead, setStoryLead] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const [responseFilterId, setResponseFilterId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [applied, setApplied] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user_info")) || {};
    setUserId(userInfo.employee_code || "Admin001");
  }, []);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, responseFilterId, searchQuery]);

  useEffect(() => {
    if (applied) fetchLeads(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  useEffect(() => {
    fetchResponses();
    fetchSources();
  }, []);

  const fetchLeads = async (customFrom = fromDate, customTo = toDate) => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/old-leads/my-assigned", {
        params: {
          skip: (page - 1) * limit,
          limit,
          fromdate: customFrom || undefined,
          todate: customTo || undefined,
          search: searchQuery || undefined,
          response_id: responseFilterId ?? undefined,
        },
      });

      setLeads(data.assigned_old_leads || []);
      setTotal(data.total ?? (data.assigned_old_leads || []).length);
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to load leads" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setApplied(true);
    fetchLeads(fromDate, toDate);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setApplied(false);
    setPage(1);
    fetchLeads("", "");
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

  const handleSaveComment = async (lead) => {
    if (!userId) {
      ErrorHandling({ defaultError: "User not loaded!" });
      return;
    }
    if (!lead.tempComment || !lead.tempComment.trim()) {
      ErrorHandling({ defaultError: "Comment cannot be empty!" });
      return;
    }
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
      ErrorHandling({ error: error, defaultError: "Failed to save comment" });
    }
  };

  const handleUpdateName = async (lead) => {
    try {
      await axiosInstance.put(`/leads/${lead.id}`, lead);
      toast.success("Lead updated successfully!");
      setEditId(null);
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Update failed!" });
    }
  };

  // 🔁 Response change with FT/Callback branching
  const handleResponseChange = async (lead, newResponseId) => {
    const id = Number(newResponseId);
    if (!id) return;

    const selectedResponse = responses.find((r) => r.id === id);
    const responseName = (selectedResponse?.name || "").toLowerCase();

    if (responseName === "ft") {
      setFTLead(lead);
      setFTFromDate(lead.ft_from_date?.split("-").reverse().join("-") || "");
      setFTToDate(lead.ft_to_date?.split("-").reverse().join("-") || "");
      setShowFTModal(true);
      return;
    }

    if (responseName === "call back" || responseName === "callback") {
      setCallBackLead(lead);
      // ✅ prefill for datetime-local using the same helper as Lead page
      setCallBackDate(isoToDatetimeLocal(lead.call_back_date || ""));
      setShowCallBackModal(true);
      return;
    }

    try {
      await axiosInstance.patch(`/leads/${lead.id}/response`, {
        lead_response_id: id,
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, lead_response_id: id } : l))
      );
      toast.success("Response updated!");
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to update response!" });
    }
  };

  const responseNameMap = useMemo(
    () => Object.fromEntries(responses.map((r) => [r.id, r.name.toLowerCase()])),
    [responses]
  );

  const isFTOver = (ftToDate) => {
    if (!ftToDate) return false;
    const normalize = (d) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const [dd, mm, yyyy] = d.split("-");
      return `${yyyy}-${mm}-${dd}`;
    };
    const today = new Date().toISOString().slice(0, 10);
    return normalize(ftToDate) < today;
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
      render: (lead) => {
        const respName = responseNameMap[lead.lead_response_id] || "";

        const editFT = () => {
          setFTLead(lead);
          setFTFromDate(lead.ft_from_date?.split("-").reverse().join("-") || "");
          setFTToDate(lead.ft_to_date?.split("-").reverse().join("-") || "");
          setShowFTModal(true);
        };
        const editCB = () => {
          setCallBackLead(lead);
          setCallBackDate(isoToDatetimeLocal(lead.call_back_date || ""));
          setShowCallBackModal(true);
        };

        if (respName === "ft") {
          return (
            <div className="flex flex-col gap-1 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <strong>From:</strong> {lead.ft_from_date || "N/A"}{" "}
                  <strong>To:</strong> {lead.ft_to_date || "N/A"}
                </div>
                <button className="text-blue-600 hover:underline text-[11px] ml-3" onClick={editFT}>
                  Edit
                </button>
              </div>
              <select
                className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
              <div className={`italic ${isFTOver(lead.ft_to_date) ? "text-red-600" : "text-green-600"}`}>
                {isFTOver(lead.ft_to_date) ? "FT Over" : lead.comment || "FT assigned"}
              </div>
            </div>
          );
        }

        if (respName === "call back" || respName === "callback") {
          return (
            <div className="flex flex-col gap-1 text-xs text-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">
                  <strong>Call Back Date:</strong>{" "}
                  {lead.call_back_date ? toIST(lead.call_back_date) : "N/A"}
                </span>
                <button className="text-blue-600 hover:underline text-[11px]" onClick={editCB}>
                  Edit
                </button>
              </div>
              <select
                className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
            </div>
          );
        }

        return (
          <select
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
      },
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
            className="w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded-full flex items-center justify-center shadow"
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

  const filteredLeads = leads.filter((lead) => {
    if (responseFilterId && lead.lead_response_id !== responseFilterId) return false;
    const created = new Date(lead.created_at);
    if (fromDate && created < new Date(fromDate)) return false;
    if (toDate && created > new Date(toDate)) return false;
    if (searchQuery) {
      const hay = `${lead.full_name} ${lead.mobile}`.toLowerCase();
      if (!hay.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 ">
      {/* filters (unchanged UI) */}
      <div className="flex flex-wrap gap-4 py-4 bg-gray-50">
        <select
          value={responseFilterId || ""}
          onChange={(e) => {
            const newResponseId = e.target.value ? Number(e.target.value) : null;
            setResponseFilterId(newResponseId);
            setPage(1);
          }}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Responses</option>
          {responses.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setApplied(false);
            }}
            className="px-3 py-2 border rounded text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setApplied(false);
            }}
            className="px-3 py-2 border rounded text-sm"
          />
          {applied ? (
            <button onClick={handleClear} className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">
              Clear
            </button>
          ) : fromDate || toDate ? (
            fromDate && toDate ? (
              <button onClick={handleApply} className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                Apply
              </button>
            ) : (
              <button onClick={handleClear} className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm">
                Clear
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-7xl mx-auto overflow-hidden">
        <LeadsDataTable
          leads={filteredLeads}
          loading={loading}
          columns={columns}
          page={page}
          limit={limit}
          total={filteredLeads.length}
          onPageChange={setPage}
        />
      </div>

      {/* FT Modal */}
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

      {/* CALLBACK Modal — IST-safe */}
      <CallBackModal
        open={showCallBackModal}
        onClose={() => setShowCallBackModal(false)}
        onSave={async () => {
          if (!callBackDate) return ErrorHandling({ defaultError: "Call back date is required" });
          try {
            const cbId = responses.find(
              (r) => {
                const n = r.name.toLowerCase();
                return n === "call back" || n === "callback";
              }
            )?.id;

            await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
              lead_response_id: cbId,
              // ✅ same conversion as the Lead page
              call_back_date: formatCallbackForAPI(callBackDate),
            });

            toast.success("Call Back response and date saved!");
            // store ISO in state so future renders also show correct IST
            const savedISO = formatCallbackForAPI(callBackDate);
            setLeads((prev) =>
              prev.map((l) =>
                l.id === callBackLead.id
                  ? { ...l, lead_response_id: cbId, call_back_date: savedISO }
                  : l
              )
            );
            setShowCallBackModal(false);
          } catch (err) {
            ErrorHandling({ error: err, defaultError: "Failed to save Call Back response" });
          }
        }}
        dateValue={callBackDate}
        setDateValue={setCallBackDate}
      />

      {storyLead && (
        <StoryModal isOpen={isStoryModalOpen} onClose={() => setIsStoryModalOpen(false)} leadId={storyLead.id} />
      )}

      <CommentModal isOpen={isCommentModalOpen} onClose={() => setIsCommentModalOpen(false)} leadId={selectedLeadId} />
    </div>
  );
}
