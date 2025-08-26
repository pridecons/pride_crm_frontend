"use client";

import { axiosInstance } from "@/api/Axios";
import CallBackModal from "@/components/Lead/CallBackModal";
import CommentModal from "@/components/Lead/CommentModal";
import FTModal from "@/components/Lead/FTModal";
import LeadsDataTable from "@/components/Lead/LeadsTable";
import StoryModal from "@/components/Lead/StoryModal";
import { Pencil, Phone, MessageSquare, User, Download, BookOpenText, MessageCircle } from "lucide-react";
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
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [storyLead, setStoryLead] = useState(null)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [responseFilterId, setResponseFilterId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [applied, setApplied] = useState(false); // track if date filter is applied

  const router = useRouter()

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user_info")) || {};
    setUserId(userInfo.employee_code || "Admin001");
  }, []);

  // 🔁 Always refetch when page / response / search change
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, responseFilterId, searchQuery]);

  // ✅ Only refetch with date params when Apply is pressed
  useEffect(() => {
    if (applied) {
      fetchLeads(fromDate, toDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);




  // still fetch these just once
  useEffect(() => {
    fetchResponses();
    fetchSources();
  }, []);

  // ⬇️ make fetchLeads accept optional params
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
      setTotal(data.total ?? data.assigned_old_leads.length);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads!");
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchLeads();
  }, []);

  // apply filter
  const handleApply = () => {
    console.log("Applying filter with:", fromDate, toDate);
    setApplied(true);
    fetchLeads(fromDate, toDate); // ✅ use current dates
  };

  // clear filter
  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setApplied(false);
    setPage(1);
    fetchLeads("", ""); // ✅ fetch without date filters
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
  // ✅ Replace your existing handleResponseChange with this
  const handleResponseChange = async (lead, newResponseId) => {
    const id = Number(newResponseId);
    if (!id) return;

    const selectedResponse = responses.find((r) => r.id === id);
    const responseName = (selectedResponse?.name || "").toLowerCase();

    // FT -> open FT modal
    if (responseName === "ft") {
      setFTLead(lead);
      setFTFromDate("");
      setFTToDate("");
      setShowFTModal(true);
      return;
    }

    // Call Back -> open CallBack modal
    if (responseName === "call back" || responseName === "callback") {
      setCallBackLead(lead);
      // prefill datetime-local if existing
      let dt = "";
      if (lead.call_back_date) {
        const d = new Date(lead.call_back_date);
        dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
      setCallBackDate(dt);
      setShowCallBackModal(true);
      return;
    }

    // Other responses -> patch directly
    try {
      await axiosInstance.patch(`/leads/${lead.id}/response`, {
        lead_response_id: id,
      });

      // Update local state first; keep the try block minimal
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, lead_response_id: id } : l))
      );

      toast.success("Response updated!");
      // ❌ DO NOT call setActiveTab here (it isn't defined in this component)
      // if (typeof setActiveTab === "function") setActiveTab("Old Leads");
    } catch (error) {
      console.error("Error updating response:", error);
      toast.error("Failed to update response!");
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


  // ✅ Filter based on tab
  const responseNameMap = useMemo(
    () => Object.fromEntries(responses.map((r) => [r.id, r.name.toLowerCase()])),
    [responses]
  );


  // Utility to test if FT is over
  function isFTOver(ftToDate) {
    if (!ftToDate) return false;
    const normalize = (d) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const [dd, mm, yyyy] = d.split("-");
      return `${yyyy}-${mm}-${dd}`;
    };
    const today = new Date().toISOString().slice(0, 10);
    return normalize(ftToDate) < today;
  }

  // Build columns array
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
          // format existing for <input type="datetime-local">
          let dt = "";
          if (lead.call_back_date) {
            const d = new Date(lead.call_back_date);
            dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          }
          setCallBackDate(dt);
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
                <button
                  className="text-blue-600 hover:underline text-[11px] ml-3"
                  onClick={editFT}
                >
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
              <div
                className={`italic ${isFTOver(lead.ft_to_date) ? "text-red-600" : "text-green-600"
                  }`}
              >
                {isFTOver(lead.ft_to_date)
                  ? "FT Over"
                  : lead.comment || "FT assigned"}
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
                  {lead.call_back_date
                    ? new Date(lead.call_back_date).toLocaleString()
                    : "N/A"}
                </span>
                <button
                  className="text-blue-600 hover:underline text-[11px]"
                  onClick={editCB}
                >
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

        // default dropdown for other responses
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
          {/* Edit */}
          <button
            onClick={() => router.push(`/lead/${lead.id}`)}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow"
            title="Edit lead"
          >
            <Pencil size={14} />
          </button>

          {/* View Story */}
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

          {/* Comments */}
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

  // Filter & paginate
  const filteredLeads = leads.filter(lead => {
    // 1) response filter
    if (responseFilterId && lead.lead_response_id !== responseFilterId) {
      return false;
    }
    // 2) date filter (assumes each lead has a `created_at` ISO string)
    const created = new Date(lead.created_at);
    if (fromDate && created < new Date(fromDate)) return false;
    if (toDate && created > new Date(toDate)) return false;

    // 3) global search on name or mobile
    if (searchQuery) {
      const hay = `${lead.full_name} ${lead.mobile}`.toLowerCase();
      if (!hay.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const paginatedLeads = filteredLeads.slice(
    (page - 1) * limit,
    page * limit
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 ">
      <div className="flex flex-wrap gap-4 py-4 bg-gray-50">
        {/* Response dropdown */}
        <select
          value={responseFilterId || ""}
          onChange={e => {
            const newResponseId = e.target.value ? Number(e.target.value) : null;
            setResponseFilterId(newResponseId);
            setPage(1); // Reset to first page when filter changes
          }}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">All Responses</option>
          {responses.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* From date */}
        {/* <div>
          <label className="block text-xs mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          />
        </div> */}

        {/* To date */}
        {/* <div>
          <label className="block text-xs mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          />
        </div> */}
        <div className="flex items-center gap-3">
          {/* From Date */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setApplied(false); // reset apply state if user changes date
            }}
            className="px-3 py-2 border rounded text-sm"
          />

          {/* To Date */}
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setApplied(false);
            }}
            className="px-3 py-2 border rounded text-sm"
          />

          {/* Button Logic */}
          {applied ? (
            // After Apply → always show Clear
            <button
              onClick={handleClear}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
            >
              Clear
            </button>
          ) : fromDate || toDate ? (
            fromDate && toDate ? (
              <button
                onClick={handleApply}
                className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Apply
              </button>
            ) : (
              <button
                onClick={handleClear}
                className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
              >
                Clear
              </button>
            )
          ) : null}
        </div>


        {/* Global search */}
        {/* <input
          type="text"
          placeholder="Search leads…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border rounded text-sm"
        /> */}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-7xl mx-auto overflow-hidden">
        <LeadsDataTable
          leads={leads}
          loading={loading}
          columns={columns}
          page={page}
          limit={limit}
          total={filteredLeads.length}
          onPageChange={setPage}
        />
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


    </div>
  );

}