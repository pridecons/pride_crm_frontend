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
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  formatCallbackForAPI,
  isoToDatetimeLocal,
  toIST,
} from "@/utils/dateUtils";
import CallButton from "@/components/Lead/CallButton";
import { ErrorHandling } from "@/helper/ErrorHandling";

export const AssigneeAutoComplete = memo(function AssigneeAutoComplete({
  value, setValue,
  selected, setSelected,
  options, loading, open, setOpen,
  onSearch, onClear, onPick,
}) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [setOpen]);

  return (
    <div ref={wrapRef} className="relative w-[260px]">
      <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">
        Assignee
      </label>
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          value={selected ? `${selected.name} (${selected.employee_code})` : value}
          placeholder="Search employee (min 2 chars)…"
          onChange={(e) => {
            if (selected) setSelected(null);
            const v = e.target.value;
            setValue(v);
            if (v.trim().length === 0) {
              setOpen(false);
              onClear?.();
            } else {
              onSearch(v);
              setOpen(true);
            }
          }}
          onFocus={() => { if (options.length) setOpen(true); }}
          className="w-full rounded-lg px-3 py-2 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          style={{ borderColor: "var(--theme-input-border)" }}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="assignee-autocomplete-list"
        />
        {selected && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded border"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-textSecondary)" }}
            onClick={() => { setSelected(null); setValue(""); setOpen(false); onClear?.(); }}
            aria-label="Clear assignee"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div
          id="assignee-autocomplete-list"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border shadow-lg"
          style={{ background: "var(--theme-components-card-bg)", borderColor: "var(--theme-components-card-border)" }}
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">Searching…</div>
          ) : options.length ? (
            options.map((opt) => (
              <button
                key={opt.employee_code}
                role="option"
                type="button"
                onClick={() => {
                  setSelected({ employee_code: opt.employee_code, name: opt.name });
                  setValue("");
                  setOpen(false);
                  onPick?.(opt.employee_code);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--theme-surface)]"
                style={{ color: "var(--theme-text)" }}
              >
                <div className="text-sm font-medium truncate">
                  {opt.name} <span className="opacity-70">({opt.employee_code})</span>
                </div>
                {opt.role && (
                  <div className="text-[11px] text-[var(--theme-textSecondary)]">{opt.role}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">No matches</div>
          )}
        </div>
      )}
    </div>
  );
});

// Pill-styled select like Assignee
function ResponseSelectPill({ value, onChange, options = [] }) {
  return (
    <div className="relative w-[220px]">
      <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">
        Response
      </label>

      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg px-3 py-2 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2  border-[var(--theme-border)]focus:ring-[var(--theme-primary)]"
          style={{ borderColor: "var(--theme-input-border)" }}
        >
          <option value=""
            className="bg-[var(--theme-surface)] ">All Responses</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}
              className="bg-[var(--theme-surface)]">{r.name}</option>
          ))}
        </select>

        {value != null && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded border"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-textSecondary)" }}
            onClick={() => onChange(null)}
            aria-label="Clear response"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// Pill-styled date input like Assignee
function DateInputPill({ label = "Date", value, onChange, placeholder = "yyyy-mm-dd" }) {
  return (
    <div className="relative w-[180px]">
      <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5">
        {label}
      </label>

      <div className="relative">
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          style={{ borderColor: "var(--theme-input-border)" }}
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded border"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-textSecondary)" }}
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()} date`}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// --- cookie helpers (client-side) ---
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([$?*|{}\[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function readUserFromCookies() {
  try {
    const raw = getCookie("user_info");
    if (!raw) return null;
    // if your cookie stores raw JSON
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const normalizeRoleKey = (r) =>
  (r ?? "").toString().trim().toUpperCase().replace(/\s+/g, "_");

const pickBranchId = (u) =>
  u?.branch_id ??
  u?.user?.branch_id ??
  u?.branch?.id ??
  u?.assigned_user?.branch_id ??
  null;

const pickEmployeeCode = (u) =>
  u?.employee_code ?? u?.user?.employee_code ?? null;

// If your user objects carry a reporting field; we’ll check multiple common keys:
const reportsToMe = (u, myCode) => {
  const mgrKeys = ["reporting_to", "reporting_manager", "manager_code", "manager_employee_code", "sba_code"];
  return mgrKeys.some((k) => String(u?.[k] ?? "").trim() === String(myCode).trim());
};

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

import { Eye } from "lucide-react"; // add to your icon imports

function useClickAway(ref, onAway) {
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && onAway?.();
    const onKey = (e) => e.key === "Escape" && onAway?.();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onAway]);
}

function ResponsePreviewButton({ kind, lead, onEdit }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickAway(wrapRef, () => setOpen(false));

  const isFT = kind === "ft";

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center h-7 w-7 rounded border"
        style={{
          background: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
          // highlight when open
          color: open ? "var(--theme-primary)" : "var(--theme-textSecondary)",
        }}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "View"} ${isFT ? "FT" : "Call Back"} details`}
      >
        {open ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-50 rounded-lg border shadow-lg p-3 min-w-[220px]"
          style={{
            background: "var(--theme-components-card-bg)",
            borderColor: "var(--theme-components-card-border)",
            color: "var(--theme-text)",
          }}
        >

          {isFT ? (
            <div
              className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1 min-w-[280px]"
              style={{ lineHeight: 1.2 }}
            >
              <span className="text-[11px] opacity-70">From:</span>
              <span className="font-medium">{lead.ft_from_date || "N/A"}</span>

              <span className="opacity-30">•</span>

              <span className="text-[11px] opacity-70">To:</span>
              <span className="font-medium">{lead.ft_to_date || "N/A"}</span>

              {lead.ft_service_type && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="text-[11px] opacity-70">Type:</span>
                  <span className="font-medium">{lead.ft_service_type}</span>
                </>
              )}
            </div>
          ) : (
            <div
              className="text-sm flex flex-wrap items-center gap-x-2 min-w-[260px]"
              style={{ lineHeight: 1.2 }}
            >
              <span className="text-[11px] opacity-70">Date &amp; Time:</span>
              <span className="font-medium">
                {lead.call_back_date ? toIST(lead.call_back_date) : "N/A"}
              </span>
            </div>
          )}

          {onEdit && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => { setOpen(false); onEdit(); }}
                className="px-2 py-1 text-[12px] rounded border"
                style={{
                  color: "var(--theme-primary)",
                  borderColor: "var(--theme-primary)",
                  background: "transparent",
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FTLegend() {
  const Chip = ({ colorVar, label, hint }) => (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5"
      style={{
        background: "var(--theme-input-bg)",
        color: `var(${colorVar})`,
      }}
      title={hint}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: `var(${colorVar})` }}
      />
      {label}
    </span>
  );

  return (
    <div
      className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex flex-wrap items-center gap-2"
      style={{ pointerEvents: "none" }} // legend is display-only
    >
      <Chip
        colorVar="--theme-info, #3b82f6"
        label="FT assigned (future)"
        hint="FT dates are in the future or missing"
      />
      <Chip
        colorVar="--theme-success, #16a34a"
        label="FT running (today)"
        hint="Today is within the FT date range"
      />
      <Chip
        colorVar="--theme-error, #ef4444"
        label="FT over (ended)"
        hint="FT end date has passed"
      />
    </div>
  );
}

export default function OldLeadsTable() {
  const [myRole, setMyRole] = useState("");       // e.g. "SUPERADMIN", "BRANCH_MANAGER", "SBA", "BA"
  const [myBranchId, setMyBranchId] = useState(null);
  const [myEmployeeCode, setMyEmployeeCode] = useState(null);
  const [leads, setLeads] = useState([]);
  const [responses, setResponses] = useState([]);
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

  const [uiFromDate, setUiFromDate] = useState("");
  const [uiToDate, setUiToDate] = useState("");

  // under other state hooks
  const [selectedAssignee, setSelectedAssignee] = useState(null); // { employee_code, name }
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeTimer = useRef(null);

  // extend the appliedFilters shape to carry assigned user (for team view)
  const [appliedFilters, setAppliedFilters] = useState({
    from: "",
    to: "",
    assignedUser: null, // <-- NEW
  });

  const router = useRouter();

  useEffect(() => {
    // 1) Try cookies
    const cookieUser = readUserFromCookies();

    // 2) Fallback to localStorage if cookie missing (optional)
    const lsUser = !cookieUser ? JSON.parse(localStorage.getItem("user_info") || "{}") : null;

    const info = cookieUser || lsUser || {};

    setUserId(info?.employee_code || info?.user?.employee_code || "Admin001");

    const roleGuess =
      info?.profile_role?.name ??
      info?.role_name ??
      info?.role ??
      info?.user?.role_name ??
      info?.user?.role ??
      "";
    setMyRole(normalizeRoleKey(roleGuess));
    setMyBranchId(pickBranchId(info));
    setMyEmployeeCode(pickEmployeeCode(info));
  }, []);

  useEffect(() => {
    fetchResponses();
  }, []);

  const searchAssignees = useCallback((q) => {
    if (assigneeTimer.current) clearTimeout(assigneeTimer.current);

    assigneeTimer.current = setTimeout(async () => {
      const query = (q || "").trim();
      if (query.length < 2) { setAssigneeOptions([]); return; }

      try {
        setAssigneeLoading(true);

        // ✅ Only pass the search term. The API applies role/branch/team scoping from the cookie.
        const { data } = await axiosInstance.get("/users-fiter/", {
          params: { search: query }
        });

        const list = Array.isArray(data) ? data : [];

        setAssigneeOptions(
          list
            // don’t show myself in the list
            .filter(u => String(u.employee_code) !== String(myEmployeeCode))
            .map(u => ({
              employee_code: u.employee_code,
              name: u.name,
              role: u?.profile_role?.name ?? u?.role_id
            }))
        );
      } catch {
        setAssigneeOptions([]);
      } finally {
        setAssigneeLoading(false);
        setAssigneeDropdownOpen(true);
      }
    }, 250);
  }, [myEmployeeCode]);

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
        const { from, to, assignedUser } = appliedFilters;
        const dateApplied = !!((from && from.trim()) || (to && to.trim()));

        const params = {
          skip: dateApplied ? 0 : (page - 1) * limit,
          limit: dateApplied ? 1000 : limit,
          view: viewType || "self",
        };
        if (searchQuery?.trim()) params.search = searchQuery.trim();

        // ✅ response filter is LIVE
        if (responseFilterId != null) params.response_id = responseFilterId;

        // team-assignee (still live)
        if (viewType === "team" && assignedUser) {
          params.assigned_user = assignedUser;
        }

        const { data } = await axiosInstance.get("/old-leads/my-assigned", { params });
        const all = data.assigned_old_leads || [];

        if (!dateApplied) {
          setLeads(all);
          const serverTotal = data.count ?? data.total ?? 0;
          setTotal(serverTotal);
          const maxPages = Math.max(1, Math.ceil(serverTotal / limit));
          if (page > maxPages) setPage(maxPages);
        } else {
          const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
          const f = (from || "").trim();
          const t = (to || "").trim();
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
    // 👉 depend on live response + applied dates
    [page, limit, viewType, searchQuery, appliedFilters, responseFilterId]
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && !didRunOnceDev.current) {
      didRunOnceDev.current = true;
      return;
    }
    doFetchLeads();
  }, [doFetchLeads]);

  const handleApplyFilters = () => {
    setAppliedFilters(prev => ({
      ...prev,
      from: (uiFromDate || "").trim(),
      to: (uiToDate || "").trim(),
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    // clear ONLY date + team selection; response can be cleared too if you prefer
    setUiFromDate("");
    setUiToDate("");
    setSelectedAssignee(null);
    setAssigneeQuery("");
    setAppliedFilters({ from: "", to: "", assignedUser: null });

    // If "Reset" should also clear response, keep this; otherwise remove it:
    setResponseFilterId(null);

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
        const respName = (responseNameMap[lead.lead_response_id] || "").toLowerCase();

        const editFT = () => {
          setFTLead(lead);
          setFTFromDate(lead.ft_from_date?.split("-").reverse().join("-") || "");
          setFTToDate(lead.ft_to_date?.split("-").reverse().join("-") || "");
          setFTServiceType(lead.ft_service_type || "CALL");
          setShowFTModal(true);
        };
        const editCB = () => {
          setCallBackLead(lead);
          setCallBackDate(isoToDatetimeLocal(lead.call_back_date || ""));
          setShowCallBackModal(true);
        };

        // Accepts "yyyy-mm-dd" or "dd-mm-yyyy"
        const normalizeYMD = (d) => {
          if (!d) return null;
          const s = String(d).trim();
          if (!s) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                 // already yyyy-mm-dd
          const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);               // dd-mm-yyyy
          if (m) return `${m[3]}-${m[2]}-${m[1]}`;
          return null; // unknown format
        };

        const todayYMD = () => new Date().toISOString().slice(0, 10);

        /**
         * Decide FT state for a lead:
         * - Not on running date   => "FT assigned" (BLUE)
         * - On running dates      => "FT running" (GREEN)
         * - Past end date         => "FT Over"    (RED)
         */
        const getFTState = (lead) => {
          const from = normalizeYMD(lead.ft_from_date);
          const to = normalizeYMD(lead.ft_to_date);
          const today = todayYMD();

          // If we don't have both dates, treat as assigned (future/unscheduled)
          if (!from || !to) {
            return { label: "FT assigned", color: "var(--theme-info, #3b82f6)" }; // blue
          }

          if (to < today) {
            return { label: "FT Over", color: "var(--theme-error, #ef4444)" };    // red
          }

          if (from <= today && today <= to) {
            return { label: "FT running", color: "var(--theme-success, #16a34a)" };// green
          }

          // from is in the future
          return { label: "FT assigned", color: "var(--theme-info, #3b82f6)" };    // blue
        };

        const isFT = respName === "ft";

        return (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <div className="relative w-full">
              <select
                className={`w-full h-9 px-1 py-1 rounded text-sm appearance-none ${isFT ? "pr-30" : "pr-8"
                  }`}
                style={{
                  ...inputPillStyle,
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  backgroundImage: "none",
                  lineHeight: "1.25rem",
                }}
                value={lead.lead_response_id || ""}
                onChange={(e) => handleResponseChange(lead, e.target.value)}
              >
                <option value="">Select Response</option>
                {responses
                  .filter((r) => r.name !== "CLIENT")
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>

              {isFT && (() => {
                const ft = getFTState(lead);
                return (
                  <span
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-8
                 px-2 py-[2px] rounded text-[11px] font-medium whitespace-nowrap"
                    style={{
                      border: `1px solid ${ft.color}`,
                      color: ft.color,
                      background: "var(--theme-input-bg)",
                    }}
                    title={ft.label}
                  >
                    {ft.label}
                  </span>
                );
              })()}

              <span
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-2"
                style={{ color: "var(--theme-textSecondary)" }}
              >
                ▼
              </span>
            </div>

            {isFT && <ResponsePreviewButton kind="ft" lead={lead} onEdit={editFT} />}
            {(respName === "call back" || respName === "callback") && (
              <ResponsePreviewButton kind="cb" lead={lead} onEdit={editCB} />
            )}
          </div>
        );
      },
    },

    {
      header: "Source",
      render: (lead) => {
        const name =
          lead?.lead_source?.name ??
          (lead?.lead_source_id ? `ID: ${lead.lead_source_id}` : "N/A");

        return (
          <span
            className="inline-block px-2 py-1 text-xs font-medium rounded"
            style={tagSuccessStyle}
            title={name}
          >
            {name}
          </span>
        );
      },
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
          {/* <CallButton lead={lead} onRefresh={fetchLeads} /> */}

          <button
            onClick={() => router.push(`/lead/${lead.id}`)}
            title="Edit lead"
            className="group w-8 h-8 inline-flex items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
            style={{ color: "var(--theme-primary)" }}
          >
            <Pencil size={20} className="transition-transform duration-150 group-hover:scale-110" />
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
      className="fixed top-7 right-0 bottom-0 left-[var(--sbw)] transition-[left] duration-200 p-4 overflow-hidden flex flex-col"
      style={{ background: "var(--theme-background)" }}
    >
      {/* Filters bar */}
      <div className="shrink-0 w-full py-4" style={{ background: "var(--theme-background)" }}>
        {/* Tabs */}
        <div
  className="text-sm font-medium text-center border-b relative"
  style={{ color: "var(--theme-textSecondary)", borderColor: "var(--theme-border)" }}
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
          <FTLegend />
        </div>

        {/* Filter controls */}
        <div className="w-full flex flex-wrap items-center justify-end gap-3 md:gap-4 p-2 md:p-2">
          {/* Assignee (team view only) */}
          {viewType === "team" && (
            <AssigneeAutoComplete
              value={assigneeQuery}
              setValue={setAssigneeQuery}
              selected={selectedAssignee}
              setSelected={setSelectedAssignee}
              options={assigneeOptions}
              loading={assigneeLoading}
              open={assigneeDropdownOpen}
              setOpen={setAssigneeDropdownOpen}
              onSearch={searchAssignees}
              // Clear → fetch immediately (assigned removed)
              onClear={() => {
                setAppliedFilters(prev => ({ ...prev, assignedUser: null }));
                setPage(1);
              }}
              // Pick → fetch immediately (assigned applied)
              onPick={(empCode) => {
                setAppliedFilters(prev => ({ ...prev, assignedUser: empCode }));
                setPage(1);
              }}
            />
          )}
          {/* Response (draft only) */}
          <ResponseSelectPill
            value={responseFilterId}
            onChange={(val) => {
              setResponseFilterId(val ?? null); // LIVE trigger
              setPage(1);
            }}
            options={responses}
          />

          {/* Divider */}
          <span className="hidden mt-4 sm:block h-6 w-px" style={{ background: "var(--theme-border)" }} />

          {/* Date range (draft only) */}
          <DateInputPill label="From" value={uiFromDate} onChange={setUiFromDate} />
          <DateInputPill label="To" value={uiToDate} onChange={setUiToDate} />

          {/* Divider */}
          <span className="hidden mt-4 sm:block h-6 w-px" style={{ background: "var(--theme-border)" }} />

          {/* Actions */}
          <div className="flex mt-6 items-center gap-2">
            <button
              onClick={handleResetFilters}
              className={BTN_BASE}
              style={btnSoftStyle}
              title="Reset all filters"
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilters}
              className={BTN_BASE}
              style={btnPrimaryStyle}
              onMouseDown={(e) => (e.currentTarget.style.boxShadow = btnPrimaryFocus.boxShadow)}
              onMouseUp={(e) => (e.currentTarget.style.boxShadow = btnPrimaryStyle.boxShadow)}
              title="Apply filters"
            >
              Apply
            </button>
          </div>
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
