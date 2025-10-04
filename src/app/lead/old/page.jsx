"use client";

import { axiosInstance } from "@/api/Axios";
import CallBackModal from "@/components/Lead/CallBackModal";
import CommentModal from "@/components/Lead/CommentModal";
import FTModal from "@/components/Lead/FTModal";
import LeadsDataTable from "@/components/Lead/LeadsTable";
import StoryModal from "@/components/Lead/StoryModal";
import {
  Pencil,
  BookOpenText,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  formatCallbackForAPI,
  isoToDatetimeLocal,
  toIST,
} from "@/utils/dateUtils";
import CallButton from "@/components/Lead/CallButton";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* ---------- Theme-driven UI tokens (style only) ---------- */

// Base button layout classes (spacing/shape)
const BTN_BASE =
  "inline-flex items-center gap-2 rounded-full text-sm font-medium px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2";

// Button visual styles via theme vars
const btnPrimaryStyle = {
  background:
    "var(--theme-components-button-primary-bg, var(--theme-primary))",
  color:
    "var(--theme-components-button-primary-text, #fff)",
  border:
    "1px solid var(--theme-components-button-primary-border, transparent)",
  boxShadow:
    "0 1px 0 0 var(--theme-components-button-primary-shadow, transparent)",
};
const btnPrimaryFocus = {
  boxShadow:
    "0 0 0 2px var(--theme-components-button-primary-hoverBg, rgba(0,0,0,0.08))",
};

const btnSoftStyle = {
  background:
    "var(--theme-components-button-secondary-bg, var(--theme-surface))",
  color:
    "var(--theme-components-button-secondary-text, var(--theme-text))",
  border:
    "1px solid var(--theme-components-button-secondary-border, var(--theme-border))",
  boxShadow:
    "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
};

// Input pill
const inputPillStyle = {
  background:
    "var(--theme-components-input-bg, var(--theme-inputBackground))",
  color: "var(--theme-components-input-text, var(--theme-text))",
  border:
    "1px solid var(--theme-components-input-border, var(--theme-inputBorder))",
};

// Tabs
const tabBase =
  "inline-block p-4 border-b-2 rounded-t-lg cursor-pointer";
const tabActiveStyle = {
  color: "var(--theme-components-sidebar-activeText, var(--theme-primary))",
  borderBottomColor:
    "var(--theme-components-sidebar-activeText, var(--theme-primary))",
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
};
const tabInactiveStyle = {
  color: "var(--theme-components-sidebar-text, var(--theme-textSecondary))",
  borderBottomColor: "transparent",
};

// Tag (Source)
const tagSuccessStyle = {
  background:
    "var(--theme-components-tag-success-bg, rgba(34,197,94,0.10))",
  color:
    "var(--theme-components-tag-success-text, #16a34a)",
  border:
    "1px solid var(--theme-components-tag-success-border, rgba(34,197,94,0.35))",
};

/* tiny utility */
const Show = (v) =>
  v == null || String(v).trim() === "" ? (
    <span style={{ color: "var(--theme-textSecondary)" }}>—</span>
  ) : (
    String(v)
  );

export default function OldLeadsTable() {
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sources, setSources] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [editId, setEditId] = useState(null);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);
  const [activeResponseId, setActiveResponseId] = useState(null); // kept as-is (unused behavior preserved)
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
  const [viewType, setViewType] = useState("self"); // team

  const [ftServiceType, setFTServiceType] = useState("Call");

  const router = useRouter();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("user_info")) || {};
    setUserId(userInfo.employee_code || "Admin001");
  }, []);

  useEffect(() => {
    fetchResponses();
    fetchSources();
  }, []);

  const fetchLeads = async (customFrom = fromDate, customTo = toDate) => {
    setLoading(true);
    try {
      const dateApplied = !!(
        (customFrom && customFrom.trim()) ||
        (customTo && customTo.trim())
      );
      const params = {
        skip: dateApplied ? 0 : (page - 1) * limit,
        limit: dateApplied ? 1000 : limit,
        view: viewType || "self",
      };

      if (searchQuery && searchQuery.trim() !== "") {
        params.search = searchQuery;
      }
      if (responseFilterId !== null && responseFilterId !== undefined) {
        params.response_id = responseFilterId;
      }

      const { data } = await axiosInstance.get("/old-leads/my-assigned", {
        params,
      });

      const all = data.assigned_old_leads || [];

      if (!dateApplied) {
        setLeads(all);
        const serverTotal = data.count ?? data.total ?? 0;
        setTotal(serverTotal);
        const maxPages = Math.max(1, Math.ceil(serverTotal / limit));
        if (page > maxPages) setPage(maxPages);
      } else {
        const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
        const f = (customFrom || "").trim();
        const t = (customTo || "").trim();
        const inRange = (d) => {
          if (!f && !t) return true;
          if (f && !t) return d === f;
          if (!f && t) return d === t;
          return d >= f && d <= t;
        };
        const filtered = all.filter((l) => inRange(day(l.response_changed_at)));

        const start = (page - 1) * limit;
        const end = start + limit;
        setLeads(filtered.slice(start, end));
        setTotal(filtered.length);
        const maxPages = Math.max(1, Math.ceil(filtered.length / limit));
        if (page > maxPages) setPage(maxPages);
      }
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to load leads" });
    } finally {
      setLoading(false);
    }
  };

  const didRunOnceDev = useRef(false);
  const doFetchLeads = useCallback(
    async () => {
      setLoading(true);
      try {
        const dateApplied = !!(
          (fromDate && fromDate.trim()) || (toDate && toDate.trim())
        );

        const params = {
          skip: dateApplied ? 0 : (page - 1) * limit,
          limit: dateApplied ? 1000 : limit,
          view: viewType || "self",
        };
        if (searchQuery?.trim()) params.search = searchQuery.trim();
        if (responseFilterId != null) params.response_id = responseFilterId;

        const { data } = await axiosInstance.get("/old-leads/my-assigned", {
          params,
        });
        const all = data.assigned_old_leads || [];

        if (!dateApplied) {
          setLeads(all);
          const serverTotal = data.count ?? data.total ?? 0;
          setTotal(serverTotal);
          const maxPages = Math.max(1, Math.ceil(serverTotal / limit));
          if (page > maxPages) setPage(maxPages);
        } else {
          const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
          const f = (fromDate || "").trim();
          const t = (toDate || "").trim();
          const inRange = (d) => {
            if (!f && !t) return true;
            if (f && !t) return d === f;
            if (!f && t) return d === t;
            return d >= f && d <= t;
          };
          const filtered = all.filter((l) => inRange(day(l.response_changed_at)));
          const start = (page - 1) * limit;
          const end = start + limit;
          setLeads(filtered.slice(start, end));
          setTotal(filtered.length);
          const maxPages = Math.max(1, Math.ceil(filtered.length / limit));
          if (page > maxPages) setPage(maxPages);
        }
      } catch (error) {
        ErrorHandling({ error, defaultError: "Failed to load leads" });
      } finally {
        setLoading(false);
      }
    },
    [
      axiosInstance,
      page,
      limit,
      viewType,
      searchQuery,
      responseFilterId,
      fromDate,
      toDate,
    ]
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !didRunOnceDev.current) {
      didRunOnceDev.current = true;
      return;
    }
    doFetchLeads();
  }, [doFetchLeads]);

  const handleApply = () => {
    setApplied(true);
    setPage(1);
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setApplied(false);
    setPage(1);
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
          l.id === lead.id
            ? { ...l, comment: data.comment, tempComment: "" }
            : l
        )
      );
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to save comment" });
    }
  };

  const handleUpdateName = async (lead, nameRaw) => {
    const name = (nameRaw || "").trim();

    if (!name) {
      setEditId(null);
      return;
    }
    if ((lead.full_name || "").trim()) {
      setEditId(null);
      return;
    }

    try {
      await axiosInstance.put(`/leads/${lead.id}`, {
        ...lead,
        full_name: name,
      });
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

  // 🔁 Response change with FT/Callback branching
  const handleResponseChange = async (lead, newResponseId) => {
    const id = Number(newResponseId);
    if (!id) return;

    const selectedResponse = responses.find((r) => r.id === id);
    const responseName = (selectedResponse?.name || "").toLowerCase();

    if (responseName === "ft") {
      setFTLead(lead);
      setFTFromDate(
        lead.ft_from_date?.split("-").reverse().join("-") || ""
      );
      setFTToDate(lead.ft_to_date?.split("-").reverse().join("-") || "");
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
        lead_response_id: id,
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, lead_response_id: id } : l))
      );
      toast.success("Response updated!");
    } catch (error) {
      ErrorHandling({
        error: error,
        defaultError: "Failed to update response!",
      });
    }
  };

  const responseNameMap = useMemo(
    () =>
      Object.fromEntries(responses.map((r) => [r.id, r.name.toLowerCase()])),
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

  // Columns
  const baseColumns = [
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
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onBlur={(e) => handleUpdateName(lead, e.currentTarget.value)}
            className="w-full px-2 py-1 rounded text-sm"
            style={{
              background: "var(--theme-components-input-bg)",
              color: "var(--theme-components-input-text)",
              border:
                "1px solid var(--theme-components-input-border, var(--theme-border))",
              outline: "none",
            }}
          />
        ) : hasName ? (
          <span
            className="truncate"
            title={lead.full_name}
            style={{ color: "var(--theme-text)" }}
          >
            {lead.full_name}
          </span>
        ) : (
          <span
            onClick={() => setEditId(lead.id)}
            className="truncate cursor-pointer italic"
            title="Click to add name"
            style={{ color: "var(--theme-textSecondary)" }}
          >
            — Click to add name
          </span>
        );
      },
    },

    { header: "Mobile", render: (lead) => Show(lead.mobile) },

    {
      header: "Email",
      align: "left",
      render: (lead) =>
        lead.email ? (
          <span
            className="inline-block max-w-[180px] md:max-w-[240px] truncate align-middle"
            title={lead.email}
            style={{ color: "var(--theme-text)" }}
          >
            {shortEmail(lead.email)}
          </span>
        ) : (
          <span style={{ color: "var(--theme-textSecondary)" }}>—</span>
        ),
    },

    {
      header: "Response",
      render: (lead) => {
        const respName = responseNameMap[lead.lead_response_id] || "";

        const editFT = () => {
          setFTLead(lead);
          setFTFromDate(
            lead.ft_from_date?.split("-").reverse().join("-") || ""
          );
          setFTToDate(
            lead.ft_to_date?.split("-").reverse().join("-") || ""
          );
          setFTServiceType(lead.ft_service_type || "CALL");
          setShowFTModal(true);
        };

        const editCB = () => {
          setCallBackLead(lead);
          setCallBackDate(isoToDatetimeLocal(lead.call_back_date || ""));
          setShowCallBackModal(true);
        };

        if (respName === "ft") {
          return (
            <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--theme-textSecondary)" }}>
              <div className="inline-flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[11px]">
                  From:
                </span>
                <span
                  className="truncate font-medium"
                  style={{ color: "var(--theme-text)" }}
                >
                  {lead.ft_from_date || "N/A"}
                </span>

                <span className="shrink-0 text-[11px] ml-3">
                  To:
                </span>
                <span
                  className="truncate font-medium"
                  style={{ color: "var(--theme-text)" }}
                >
                  {lead.ft_to_date || "N/A"}
                </span>

                <button
                  onClick={editFT}
                  title="Edit FT"
                  className="ml-auto inline-flex h-7 px-2 items-center rounded text-[11px]"
                  style={{
                    color: "var(--theme-primary)",
                    border: "1px solid var(--theme-primary)",
                    background: "transparent",
                  }}
                >
                  Edit
                </button>
              </div>

              <select
                className="w-full px-2 py-1 rounded text-sm"
                style={inputPillStyle}
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
                className="italic"
                style={{
                  color: isFTOver(lead.ft_to_date)
                    ? "var(--theme-error, #ef4444)"
                    : "var(--theme-success, #22c55e)",
                }}
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
            <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--theme-textSecondary)" }}>
              <div className="inline-flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[11px]">Date & Time:</span>
                <time
                  className="truncate font-medium"
                  title={lead.call_back_date ? toIST(lead.call_back_date) : "N/A"}
                  style={{ color: "var(--theme-text)" }}
                >
                  {lead.call_back_date ? toIST(lead.call_back_date) : "N/A"}
                </time>

                <button
                  onClick={editCB}
                  className="ml-auto inline-flex h-7 px-2 items-center rounded text-[11px]"
                  title="Edit callback"
                  style={{
                    color: "var(--theme-primary)",
                    border: "1px solid var(--theme-primary)",
                    background: "transparent",
                  }}
                >
                  Edit
                </button>
              </div>

              <select
                className="w-full px-2 py-1 rounded text-sm"
                style={inputPillStyle}
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
            className="w-full px-2 py-1 rounded text-sm"
            style={inputPillStyle}
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
        <span
          className="inline-block px-2 py-1 text-xs font-medium rounded"
          style={tagSuccessStyle}
        >
          {sources.find((s) => s.id === lead.lead_source_id)?.name || "N/A"}
        </span>
      ),
    },
  ];

  const assignedUserColumn = {
    header: "Assigned",
    render: (lead) => {
      const a = lead.assigned_user || {};
      const label =
        (a.name && a.name.trim()) ||
        (a.employee_code && a.employee_code.trim()) ||
        (lead.assigned_to_user && String(lead.assigned_to_user).trim()) ||
        "—";

      const titleParts = [];
      if (a.name) titleParts.push(a.name);
      if (a.email) titleParts.push(a.email);
      if (a.role) titleParts.push(a.role);
      const title = titleParts.join(" • ");
      const isEmpty = label === "—";
      return (
        <span
          className="truncate"
          title={title || label}
          style={{
            color: isEmpty
              ? "var(--theme-textSecondary)"
              : "var(--theme-primary)",
          }}
        >
          {label}
        </span>
      );
    },
  };

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (viewType === "team") {
      cols.splice(3, 0, assignedUserColumn);
    }

    cols.push({
      header: "Actions",
      render: (lead) => (
        <div className="flex gap-2">
          <CallButton lead={lead} onRefresh={fetchLeads} />

          <button
            onClick={() => router.push(`/lead/${lead.id}`)}
            title="Edit lead"
            className="group w-8 h-8 inline-flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ color: "var(--theme-primary)" }}
          >
            <Pencil size={22} className="transition-transform duration-150 group-hover:scale-110" />
          </button>

          <button
            onClick={() => {
              setStoryLead(lead);
              setIsStoryModalOpen(true);
            }}
            title="View Story"
            className="group w-8 h-8 inline-flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ color: "var(--theme-accent, var(--theme-primary))" }}
          >
            <BookOpenText size={22} className="transition-transform duration-150 group-hover:scale-110" />
          </button>

          <button
            onClick={() => {
              setSelectedLeadId(lead.id);
              setIsCommentModalOpen(true);
            }}
            title="Comments"
            className="group w-8 h-8 inline-flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ color: "var(--theme-components-tag-accent-text, var(--theme-primary))" }}
          >
            <MessageCircle size={22} className="transition-transform duration-150 group-hover:scale-110" />
          </button>
        </div>
      ),
    });

    return cols;
  }, [
    viewType,
    responses,
    sources,
    editId,
    ftFromDate,
    ftToDate,
    ftServiceType,
    router,
  ]);

  const shortEmail = (email) => {
    const raw = String(email || "").trim();
    if (!raw) return "";
    if (raw.length <= 28) return raw;
    const at = raw.indexOf("@");
    if (at === -1) return raw.slice(0, 18) + "…..";
    const local = raw.slice(0, at);
    return `${local}@…..`;
  };

  return (
    <div
      className="fixed top-16 right-0 bottom-0 left-[var(--sbw)] transition-[left] duration-200 p-4 overflow-hidden flex flex-col"
      style={{ background: "var(--theme-background)" }}
    >
      {/* Filters bar */}
      <div className="shrink-0 w-full py-4" style={{ background: "var(--theme-background)" }}>
        {/* Tabs */}
        <div
          className="text-sm font-medium text-center border-b"
          style={{
            color: "var(--theme-textSecondary)",
            borderColor: "var(--theme-border)",
          }}
        >
          <ul className="flex flex-wrap -mb-px">
            <li className="me-2" onClick={() => setViewType("self")}>
              <p
                className={tabBase}
                style={viewType === "self" ? tabActiveStyle : tabInactiveStyle}
              >
                Self
              </p>
            </li>
            <li className="me-2" onClick={() => setViewType("team")}>
              <p
                className={tabBase}
                style={viewType === "team" ? tabActiveStyle : tabInactiveStyle}
              >
                My Team
              </p>
            </li>
          </ul>
        </div>

        {/* Filter controls */}
        <div className="w-full flex flex-wrap items-center justify-end gap-3 md:gap-4 p-2 md:p-2">
          {/* Response */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium"
              style={{ color: "var(--theme-textSecondary)" }}
            >
              Response
            </span>
            <select
              value={responseFilterId || ""}
              onChange={(e) => {
                const newResponseId = e.target.value ? Number(e.target.value) : null;
                setResponseFilterId(newResponseId);
                setPage(1);
              }}
              className="rounded text-sm shadow-sm"
              style={{ ...inputPillStyle, padding: "0.5rem 2rem 0.5rem 0.75rem" }}
            >
              <option value="">All Responses</option>
              {responses.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <span
            className="hidden sm:block h-6 w-px"
            style={{ background: "var(--theme-border)" }}
          />

          {/* Date range */}
          <div className="flex items-center gap-2">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--theme-textSecondary)" }}
            >
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setApplied(false);
              }}
              className="rounded text-sm shadow-sm"
              style={{ ...inputPillStyle, padding: "0.5rem 0.75rem" }}
            />
            <label
              className="text-xs font-medium"
              style={{ color: "var(--theme-textSecondary)" }}
            >
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setApplied(false);
              }}
              className="rounded text-sm shadow-sm"
              style={{ ...inputPillStyle, padding: "0.5rem 0.75rem" }}
            />
          </div>

          {/* Divider */}
          <span
            className="hidden sm:block h-6 w-px"
            style={{ background: "var(--theme-border)" }}
          />
        </div>
      </div>

      {/* Table card */}
      <div
        className="flex-1 min-h-0 rounded-xl shadow-md mx-2 overflow-hidden flex flex-col"
        style={{
          background: "var(--theme-components-card-bg, var(--theme-cardBackground))",
          border: "1px solid var(--theme-components-card-border, var(--theme-border))",
        }}
      >
        <LeadsDataTable
          leads={leads}
          loading={loading}
          columns={columns}
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
        />
      </div>

      {/* FT Modal */}
      <FTModal
        open={showFTModal}
        onClose={() => setShowFTModal(false)}
        onSave={async (payload) => {
          try {
            const ftId = responses.find(
              (r) => r.name.toLowerCase() === "ft"
            )?.id;
            await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
              lead_response_id: ftId,
              ...payload,
            });
            toast.success("FT response saved!");
            setLeads((prev) =>
              prev.map((l) =>
                l.id === ftLead.id
                  ? { ...l, lead_response_id: ftId, ...payload }
                  : l
              )
            );
            setShowFTModal(false);
          } catch (err) {
            ErrorHandling({
              error: err,
              defaultError: "Failed to save FT response",
            });
          }
        }}
        fromDate={ftFromDate}
        toDate={ftToDate}
        setFromDate={setFTFromDate}
        setToDate={setFTToDate}
        serviceType={ftServiceType}
        setServiceType={setFTServiceType}
        serviceTypeOptions={["CALL", "SMS"]}
      />

      {/* Callback Modal */}
      <CallBackModal
        open={showCallBackModal}
        onClose={() => setShowCallBackModal(false)}
        onSave={async () => {
          if (!callBackDate)
            return ErrorHandling({
              defaultError: "Call back date is required",
            });
          try {
            const cbId = responses.find((r) => {
              const n = r.name.toLowerCase();
              return n === "call back" || n === "callback";
            })?.id;

            await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
              lead_response_id: cbId,
              call_back_date: formatCallbackForAPI(callBackDate),
            });

            toast.success("Call Back response and date saved!");
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
            ErrorHandling({
              error: err,
              defaultError: "Failed to save Call Back response",
            });
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
