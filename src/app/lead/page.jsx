"use client";

import { axiosInstance } from "@/api/Axios";
import { Pencil, Phone, MessageSquare, User, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

export default function LeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sources, setSources] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [editId, setEditId] = useState(null);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("New Leads");
  const [fullScreenDocUrl, setFullScreenDocUrl] = useState(null);
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
    try {
      const { data } = await axiosInstance.get("/leads/assignments/my");
      const items = data.assignments || [];

      const leadsWithIds = items.map((item) => ({
        ...item.lead,
        assignment_id: item.assignment_id,
      }));

      const commentRequests = leadsWithIds.map((lead) =>
        axiosInstance
          .get(`/leads/${lead.id}/comments`)
          .then((res) => ({
            leadId: lead.id,
            comment: res.data.length > 0 ? res.data[res.data.length - 1].comment : null,
          }))
          .catch(() => ({ leadId: lead.id, comment: null }))
      );

      const comments = await Promise.all(commentRequests);
      const commentMap = Object.fromEntries(comments.map((c) => [c.leadId, c.comment]));

      const leadsWithComments = leadsWithIds.map((lead) => ({
        ...lead,
        comment: commentMap[lead.id] || null,
      }));

      setLeads(leadsWithComments);
      setTotal(data.total_count || leadsWithComments.length);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads!");
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

  // ✅ Fetch New Leads Button
  const handleFetchLeads = async () => {
    try {
      const { data } = await axiosInstance.post("/leads/fetch");
      const newLeads = data.leads || [];

      setLeads((prev) => [...prev, ...newLeads]);
      toast.success(`${data.fetched_count} new leads fetched`);
      setActiveTab("New Leads");
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to fetch new leads!");
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
    try {
      await axiosInstance.put(`/leads/${lead.id}`, {
        ...lead,
        lead_response_id: newResponseId,
      });

      toast.success("Response updated!");

      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, lead_response_id: newResponseId } : l))
      );

      // ✅ Switch to Old Leads tab automatically
      setActiveTab("Old Leads");
    } catch (error) {
      console.error("Error updating response:", error);
      toast.error("Failed to update response!");
    }
  };

  // ✅ Pagination
  const totalPages = Math.ceil(total / limit);
  const paginatedLeads = leads.slice((page - 1) * limit, page * limit);

  // ✅ Filter based on tab
  const responseNameMap = useMemo(
    () => Object.fromEntries(responses.map((r) => [r.id, r.name.toLowerCase()])),
    [responses]
  );

  const filteredLeads = paginatedLeads.filter((lead) => {
    const response = responseNameMap[lead.lead_response_id] || "";

    if (activeTab === "New Leads") return !lead.lead_response_id;
    if (activeTab === "Old Leads") {
      return !!lead.lead_response_id;
    }
    if (activeTab === "Follow Up") return ["call back", "interested"].includes(response);
    if (activeTab === "FT Leads") return response === "ft";
    if (activeTab === "Disposed") return response === "disposed";
    if (activeTab === "Deleted") return response === "deleted";

    return true;
  });


  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 max-w-7xl mx-auto overflow-hidden">
        {/* ✅ Top Bar */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {["New Leads", "Old Leads", "Follow Up", "FT Leads", "Disposed", "Deleted"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={handleFetchLeads}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow hover:bg-blue-700 transition"
          >
            <Download size={16} /> Fetch Leads
          </button>
        </div>

        {/* ✅ Table Container */}
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
                  <td className="px-4 py-3">
                    {lead.comment ? (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded block truncate">
                        {lead.comment}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={lead.tempComment || ""}
                          placeholder="Add comment..."
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-400"
                          onChange={(e) => {
                            const val = e.target.value;
                            setLeads((prev) =>
                              prev.map((l) => (l.id === lead.id ? { ...l, tempComment: val } : l))
                            );
                          }}
                        />
                        <button
                          onClick={() => handleSaveComment(lead)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
                        >
                          Save
                        </button>
                      </div>
                    )}
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
    </div>
  );

}
