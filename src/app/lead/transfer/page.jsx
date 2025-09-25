"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  Send,
  Trash2,
  Archive,
  Info,
} from "lucide-react";

const scopes = [
  { value: "all", label: "All leads in this source" },
  { value: "new_only", label: "Only NEW leads (no response set)" },
  { value: "by_response", label: "Filter by response(s)" },
  { value: "lead_ids", label: "Only selected lead IDs" },
];

const tabs = [
  { key: "transfer", label: "Transfer Leads", icon: Send },
  { key: "deleteLeads", label: "Delete Leads (in Source)", icon: Trash2 },
  { key: "deleteSource", label: "Delete/Archive Source", icon: Archive },
];

export default function SourceToolsPage() {
  const [activeTab, setActiveTab] = useState("transfer");

  // dropdown data
  const [sources, setSources] = useState([]);     // [{id,name}]
  const [responses, setResponses] = useState([]); // [{id,name}]

  // Common
  const [sourceId, setSourceId] = useState("");

  // ===== Transfer state =====
  const [targetSourceId, setTargetSourceId] = useState("");
  const [scope, setScope] = useState("all");
  const [responseIds, setResponseIds] = useState([]); // array of ints, from dropdown
  const [leadIdsText, setLeadIdsText] = useState(""); // fallback free type-in
  const [selectedLeadIds, setSelectedLeadIds] = useState([]); // from LeadMulti
  const [clearAssigned, setClearAssigned] = useState(true);
  const [clearResponse, setClearResponse] = useState(true);
  const [clearDates, setClearDates] = useState(true);

  // NEW: extra clear options (transfer)
  const [clearSmsLogs, setClearSmsLogs] = useState(false);
  const [clearEmailLogs, setClearEmailLogs] = useState(false);
  const [clearComments, setClearComments] = useState(false);
  const [clearStories, setClearStories] = useState(false);
  const [clearRecordings, setClearRecordings] = useState(false);

  // ===== Delete leads (in source) =====
  const [delScope, setDelScope] = useState("all");
  const [delMode, setDelMode] = useState("soft"); // soft | hard
  const [delResponseIds, setDelResponseIds] = useState([]);
  const [delLeadIdsText, setDelLeadIdsText] = useState("");
  const [delSelectedLeadIds, setDelSelectedLeadIds] = useState([]);

  // ===== Delete/Archive source =====
  const [srcDeleteMode, setSrcDeleteMode] = useState("soft"); // soft | hard
  const [onLeads, setOnLeads] = useState("nullify"); // nullify | delete_soft | delete_hard
  const [archivePrefix, setArchivePrefix] = useState("[ARCHIVED]");

  // Result / errors
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // ---------- load dropdown options ----------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/source-tools/options");
        if (!isMounted) return;
        setSources(Array.isArray(data?.sources) ? data.sources : []);
        setResponses(Array.isArray(data?.responses) ? data.responses : []);
      } catch (e) {
        console.error("Failed to load options", e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // ---------- helpers ----------
  function parseCsvInts(csv) {
    return (csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
  }

  const transferPayload = useMemo(() => {
    const p = {
      scope,
      target_source_id: targetSourceId ? Number(targetSourceId) : undefined,
      clear_assigned: clearAssigned,
      clear_response: clearResponse,
      clear_response_dates: clearDates,

      // NEW: extra clear flags
      clear_sms_logs: clearSmsLogs,
      clear_email_logs: clearEmailLogs,
      clear_comments: clearComments,
      clear_stories: clearStories,
      clear_recordings: clearRecordings,
    };
    if (scope === "by_response") p.response_ids = responseIds;
    if (scope === "lead_ids") {
      p.lead_ids =
        selectedLeadIds.length > 0
          ? selectedLeadIds
          : parseCsvInts(leadIdsText);
    }
    return p;
  }, [
    scope,
    targetSourceId,
    clearAssigned,
    clearResponse,
    clearDates,
    responseIds,
    leadIdsText,
    selectedLeadIds,
    clearSmsLogs,
    clearEmailLogs,
    clearComments,
    clearStories,
    clearRecordings,
  ]);

  const deleteLeadsPayload = useMemo(() => {
    const p = { scope: delScope, mode: delMode };
    if (delScope === "by_response") p.response_ids = delResponseIds;
    if (delScope === "lead_ids") {
      p.lead_ids =
        delSelectedLeadIds.length > 0
          ? delSelectedLeadIds
          : parseCsvInts(delLeadIdsText);
    }
    return p;
  }, [delScope, delMode, delResponseIds, delLeadIdsText, delSelectedLeadIds]);

  // ---------- actions ----------
  async function doTransfer(e) {
    e.preventDefault();
    setError(""); setResult(null);

    if (!sourceId) return setError("From Source is required.");
    if (!targetSourceId) return setError("Target Source is required.");
    if (scope === "by_response" && (!transferPayload.response_ids || transferPayload.response_ids.length === 0))
      return setError("Select at least one response.");
    if (scope === "lead_ids" && (!transferPayload.lead_ids || transferPayload.lead_ids.length === 0))
      return setError("Select or enter at least one lead ID.");

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(`/source-tools/${Number(sourceId)}/transfer`, transferPayload);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to transfer.");
    } finally {
      setLoading(false);
    }
  }

  async function doDeleteLeads(e) {
    e.preventDefault();
    setError(""); setResult(null);

    if (!sourceId) return setError("Source is required.");
    if (delScope === "by_response" && (!deleteLeadsPayload.response_ids || deleteLeadsPayload.response_ids.length === 0))
      return setError("Select at least one response.");
    if (delScope === "lead_ids" && (!deleteLeadsPayload.lead_ids || deleteLeadsPayload.lead_ids.length === 0))
      return setError("Select or enter at least one lead ID.");

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(`/source-tools/${Number(sourceId)}/delete`, deleteLeadsPayload);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to delete leads.");
    } finally {
      setLoading(false);
    }
  }

  async function doDeleteSource(e) {
    e.preventDefault();
    setError(""); setResult(null);

    if (!sourceId) return setError("Source is required.");
    const payload = { mode: srcDeleteMode, on_leads: onLeads, archive_prefix: archivePrefix };

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(`/source-tools/${Number(sourceId)}/delete-source`, payload);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to delete/archive source.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI helpers (styled) ----------
  function Field({ label, children, hint }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-800">{label}</label>
        {children}
        {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
      </div>
    );
  }

function ScopePicker({ value, onChange }) {
  return (
    <div className="w-full">
      <div className="flex flex-row w-full gap-3">
        {scopes.map((opt) => (
          <label key={opt.value} className="w-full">
            <input
              type="radio"
              name="scope"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="peer sr-only"
            />
            <span
              className="
                flex w-full h-full items-center justify-center rounded-xl border px-3 py-3 text-sm
                border-gray-200 hover:border-gray-300
                peer-checked:border-indigo-500 peer-checked:ring-2 peer-checked:ring-indigo-200 peer-checked:bg-indigo-50
                text-gray-800 text-center whitespace-normal
              "
              title={opt.label}
            >
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}



  const inputBase =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition";

  const btnPrimary =
    "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600 " +
    "px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95 active:opacity-90 transition disabled:opacity-60";

  const btnDanger =
    "inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow " +
    "hover:bg-red-700 active:bg-red-700 transition disabled:opacity-60";

  // shared drop-downs
  const SourceSelect = ({ value, onChange, placeholder = "Select source" }) => (
    <select
      className={inputBase}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>
      ))}
    </select>
  );

  const ResponseMulti = ({ values, onChange }) => (
    <div className="rounded-xl border border-gray-200 p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {responses.map((r) => {
          const checked = values.includes(r.id);
          return (
            <label
              key={r.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm transition
              ${checked ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) onChange([...values, r.id]);
                  else onChange(values.filter((x) => x !== r.id));
                }}
              />
              <span>{r.name} (#{r.id})</span>
            </label>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
        <Info className="h-3.5 w-3.5" /> Select one or more responses.
      </p>
    </div>
  );

  // --------- Lightweight Accordion ----------
  function Accordion({ title, icon: Icon = Settings2, defaultOpen = true, children, subtle = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className={`rounded-2xl border ${subtle ? "border-gray-100" : "border-gray-200"} bg-white shadow-sm`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-indigo-600" />}
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Icon className="h-4 w-4 text-indigo-600" />
              {title}
            </span>
          </div>
        </button>
        {open && <div className="px-4 pb-4 pt-2">{children}</div>}
      </div>
    );
  }

  // --------- Lead Multi (loads from source) ----------
  function LeadMulti({ sourceId, values, onChange, hint }) {
    const [items, setItems] = useState([]); // [{id, full_name, mobile, email}]
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      let cancel = false;
      async function load() {
        if (!sourceId) { setItems([]); return; }
        setLoading(true);
        try {
          const { data } = await axiosInstance.get(`/source-tools/leads`, {
            params: { source_id: Number(sourceId), q }
          });
          if (!cancel) setItems(Array.isArray(data?.leads) ? data.leads : []);
        } catch (e) {
          if (!cancel) setItems([]);
        } finally {
          if (!cancel) setLoading(false);
        }
      }
      load();
      return () => { cancel = true; };
    }, [sourceId, q]);

    const allIds = useMemo(() => items.map((x) => x.id), [items]);

    return (
      <div className="rounded-2xl border border-gray-200 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <input
            className={inputBase}
            placeholder="Search by name, mobile, email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition"
            onClick={() => setQ("")}
          >
            Clear
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 transition"
            onClick={() => onChange(Array.from(new Set([...values, ...allIds])))}
            disabled={loading || !allIds.length}
          >
            Select All (loaded)
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 transition"
            onClick={() => onChange(values.filter((id) => !allIds.includes(id)))}
            disabled={loading || !values.length}
          >
            Unselect Loaded
          </button>
          <span className="text-xs text-gray-500">
            {loading ? "Loading..." : `${items.length} shown`} • Selected: {values.length}
          </span>
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border border-gray-100">
          {!items.length && !loading && (
            <div className="p-3 text-sm text-gray-500">No leads.</div>
          )}
          {items.map((ld) => {
            const checked = values.includes(ld.id);
            return (
              <label
                key={ld.id}
                className={`flex items-center gap-2 border-b px-3 py-2 transition
                ${checked ? "bg-indigo-50/50" : "hover:bg-gray-50"}`}
              >
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...values, ld.id]);
                    else onChange(values.filter((x) => x !== ld.id));
                  }}
                />
                <div className="text-sm">
                  <div className="font-medium text-gray-800">{ld.full_name || "—"} <span className="text-gray-400">#{ld.id}</span></div>
                  <div className="text-gray-500 text-xs">
                    {ld.mobile || "—"} • {ld.email || "—"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

<main className="mx-2 px-4 py-6 space-y-6">
  {/* Sticky Tabs — inside the SAME scrolling container */}
  <div className="sticky top-[64px] z-50 bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 shadow-lg border-b border-white/20 rounded-b-2xl [overflow-anchor:none]">
    <div className="px-2 sm:px-4">
      <div className="flex gap-2 overflow-x-auto py-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setResult(null); setError(""); }}
              className={`group relative whitespace-nowrap rounded-2xl px-1 py-1 text-sm transition
                ${active ? "text-indigo-900" : "text-white/90 hover:text-white"}`}
            >
              <span
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 transition backdrop-blur-sm
                  ${active
                    ? "border-white/80 bg-white text-indigo-700 shadow-md"
                    : "border-white/25 bg-white/10 text-white hover:bg-white/20"}`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-white/90"}`} />
                {t.label}
              </span>
              <span className={`absolute inset-x-4 -bottom-2 h-0.5 rounded-full transition ${active ? "bg-white/70" : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </div>
  </div>


        {/* Card Shell */}
        <div className="rounded-3xl border border-indigo-100/70 bg-white p-6 shadow-xl shadow-indigo-100/60 [overflow-anchor:none]">
          {/* Common: From Source */}
          <div className="mb-6">
            <Field label="Source (from)">
              <SourceSelect value={sourceId} onChange={(v) => {
                setSourceId(v);
                setSelectedLeadIds([]);
                setDelSelectedLeadIds([]);
              }} placeholder="Select source to operate on" />
            </Field>
          </div>

          {/* === Tab: Transfer === */}
          {activeTab === "transfer" && (
            <form onSubmit={doTransfer} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} className="space-y-6 w-full">
              <Accordion title="Target & Scope" icon={Send}>
                <div className="flex flex-col gap-4 w-full">
                  <Field label="Target Source">
                    <SourceSelect value={targetSourceId} onChange={setTargetSourceId} placeholder="Select target source" />
                  </Field>
                  <br />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-800 mb-2">Scope</label>
                    <ScopePicker value={scope} onChange={setScope} />
                  </div>
                </div>

                {scope === "by_response" && (
                  <div className="mt-4">
                    <Field label="Responses">
                      <ResponseMulti values={responseIds} onChange={setResponseIds} />
                    </Field>
                  </div>
                )}

                {scope === "lead_ids" && (
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Field label="Select Leads (from chosen Source)">
                      <LeadMulti
                        sourceId={sourceId}
                        values={selectedLeadIds}
                        onChange={setSelectedLeadIds}
                        hint="Search, then select. You can also type IDs below if needed."
                      />
                    </Field>
                    <Field label="Or, enter Lead IDs (comma-separated)">
                      <input
                        className={inputBase}
                        placeholder="e.g. 101,102,103"
                        value={leadIdsText}
                        onChange={(e) => setLeadIdsText(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </Accordion>

              <Accordion title="Field Clearing on Transfer" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearAssigned} onChange={(e) => setClearAssigned(e.target.checked)} />
                    <span className="text-sm text-gray-800">Clear assigned_to_user</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearResponse} onChange={(e) => setClearResponse(e.target.checked)} />
                    <span className="text-sm text-gray-800">Clear response (lead_response_id)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearDates} onChange={(e) => setClearDates(e.target.checked)} />
                    <span className="text-sm text-gray-800">Clear response dates</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  By default all three are cleared and <code className="rounded bg-gray-100 px-1">is_old_lead</code> is set to false on transfer.
                </p>
              </Accordion>

              <Accordion title="Also clear related data (optional)" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearSmsLogs} onChange={(e) => setClearSmsLogs(e.target.checked)} />
                    <span className="text-sm text-gray-800">SMS logs</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearEmailLogs} onChange={(e) => setClearEmailLogs(e.target.checked)} />
                    <span className="text-sm text-gray-800">Email logs</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearComments} onChange={(e) => setClearComments(e.target.checked)} />
                    <span className="text-sm text-gray-800">Comments</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearStories} onChange={(e) => setClearStories(e.target.checked)} />
                    <span className="text-sm text-gray-800">Stories</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input type="checkbox" className="accent-indigo-600" checked={clearRecordings} onChange={(e) => setClearRecordings(e.target.checked)} />
                    <span className="text-sm text-gray-800">Recordings</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-amber-600">
                  Use carefully: these deletions are permanent if your backend performs a hard delete.
                </p>
              </Accordion>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? "Transferring..." : "Transfer Leads"}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}

          {/* === Tab: Delete Leads (in Source) === */}
          {activeTab === "deleteLeads" && (
            <form onSubmit={doDeleteLeads} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} className="space-y-6">
              <Accordion title="Delete Settings" icon={Trash2}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Delete Mode</label>
                    <div className="flex flex-wrap gap-3">
                      {["soft", "hard"].map((m) => (
                        <label key={m} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer
                          ${delMode === m ? "border-indigo-500 bg-indigo-50/60" : "border-gray-200 hover:bg-gray-50"}`}>
                          <input type="radio" className="accent-indigo-600" name="delmode" checked={delMode === m} onChange={() => setDelMode(m)} />
                          <span className="text-sm capitalize text-gray-800">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Scope</label>
                    <ScopePicker value={delScope} onChange={setDelScope} />
                  </div>
                </div>

                {delScope === "by_response" && (
                  <div className="mt-4">
                    <Field label="Responses">
                      <ResponseMulti values={delResponseIds} onChange={setDelResponseIds} />
                    </Field>
                  </div>
                )}

                {delScope === "lead_ids" && (
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Field label="Select Leads (from chosen Source)">
                      <LeadMulti
                        sourceId={sourceId}
                        values={delSelectedLeadIds}
                        onChange={setDelSelectedLeadIds}
                      />
                    </Field>
                    <Field label="Or, enter Lead IDs (comma-separated)">
                      <input
                        className={inputBase}
                        placeholder="e.g. 101,102,103"
                        value={delLeadIdsText}
                        onChange={(e) => setDelLeadIdsText(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </Accordion>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={loading} className={btnDanger}>
                  {loading ? "Deleting..." : "Delete Leads"}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}

          {/* === Tab: Delete/Archive Source === */}
          {activeTab === "deleteSource" && (
            <form onSubmit={doDeleteSource} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} className="space-y-6">
              <Accordion title="Source Deletion / Archival" icon={Archive}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">Source Delete Mode</label>
                    <div className="flex flex-wrap gap-3">
                      {["soft", "hard"].map((m) => (
                        <label key={m} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer
                          ${srcDeleteMode === m ? "border-indigo-500 bg-indigo-50/60" : "border-gray-200 hover:bg-gray-50"}`}>
                          <input type="radio" className="accent-indigo-600" name="srcmode" checked={srcDeleteMode === m} onChange={() => setSrcDeleteMode(m)} />
                          <span className="text-sm capitalize text-gray-800">{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">On Leads</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { value: "nullify", label: "Nullify lead_source_id" },
                        { value: "delete_soft", label: "Soft delete leads" },
                        { value: "delete_hard", label: "Hard delete leads" },
                      ].map((o) => (
                        <label key={o.value} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer
                          ${onLeads === o.value ? "border-indigo-500 bg-indigo-50/60" : "border-gray-200 hover:bg-gray-50"}`}>
                          <input type="radio" className="accent-indigo-600" name="onleads" checked={onLeads === o.value} onChange={() => setOnLeads(o.value)} />
                          <span className="text-sm text-gray-800">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {srcDeleteMode === "soft" && (
                  <div className="mt-4">
                    <Field label="Archive Prefix" hint="Only used for soft delete (archiving).">
                      <input
                        className={inputBase}
                        value={archivePrefix}
                        onChange={(e) => setArchivePrefix(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </Accordion>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={srcDeleteMode === "soft" ? btnPrimary : btnDanger}
                >
                  {loading
                    ? (srcDeleteMode === "soft" ? "Archiving..." : "Deleting...")
                    : (srcDeleteMode === "soft" ? "Archive Source" : "Delete Source")}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-3xl border border-indigo-100/70 bg-white p-6 shadow-xl shadow-indigo-100/60">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Result</h2>
            <pre className="overflow-auto rounded-2xl bg-gray-900 p-4 text-sm text-gray-100">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
