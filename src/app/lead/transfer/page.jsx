"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";

const scopes = [
  { value: "all", label: "All leads in this source" },
  { value: "new_only", label: "Only NEW leads (no response set)" },
  { value: "by_response", label: "Filter by response(s)" },
  { value: "lead_ids", label: "Only selected lead IDs" },
];

const tabs = [
  { key: "transfer", label: "Transfer Leads" },
  { key: "deleteLeads", label: "Delete Leads (in Source)" },
  { key: "deleteSource", label: "Delete/Archive Source" },
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

  // ---------- small UI helpers ----------
  function Field({ label, children, hint }) {
    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        {children}
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
    );
  }

  function ScopePicker({ value, onChange }) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {scopes.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  // shared drop-downs
  const SourceSelect = ({ value, onChange, placeholder = "Select source" }) => (
    <select
      className="w-full rounded-lg border px-3 py-2"
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
    <div className="rounded-lg border p-2">
      <div className="flex flex-wrap gap-2">
        {responses.map((r) => {
          const checked = values.includes(r.id);
          return (
            <label key={r.id} className="flex items-center gap-2 rounded border px-2 py-1">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) onChange([...values, r.id]);
                  else onChange(values.filter((x) => x !== r.id));
                }}
              />
              <span className="text-sm">{r.name} (#{r.id})</span>
            </label>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-gray-500">Select one or more responses.</p>
    </div>
  );

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
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Search by name, mobile, email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg border px-3 py-2 hover:bg-gray-50"
            onClick={() => setQ("")}
          >
            Clear
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => onChange(Array.from(new Set([...values, ...allIds])))}
            disabled={loading || !allIds.length}
          >
            Select All (loaded)
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={() => onChange(values.filter((id) => !allIds.includes(id)))}
            disabled={loading || !values.length}
          >
            Unselect Loaded
          </button>
          <span className="text-xs text-gray-500">
            {loading ? "Loading..." : `${items.length} shown`} • Selected: {values.length}
          </span>
        </div>

        <div className="max-h-64 overflow-auto rounded border">
          {!items.length && !loading && (
            <div className="p-3 text-sm text-gray-500">No leads.</div>
          )}
          {items.map((ld) => {
            const checked = values.includes(ld.id);
            return (
              <label key={ld.id} className="flex items-center gap-2 border-b px-3 py-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...values, ld.id]);
                    else onChange(values.filter((x) => x !== ld.id));
                  }}
                />
                <div className="text-sm">
                  <div className="font-medium">{ld.full_name || "—"} (#{ld.id})</div>
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-semibold">Lead Source Tools</h1>
          <p className="text-sm text-gray-500">Operate on leads by source: transfer, delete & archive</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setResult(null); setError(""); }}
              className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm ${
                activeTab === t.key ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="rounded-xl bg-white p-6 shadow">
          {/* Common: From Source */}
          <Field label="Source (from)">
            <SourceSelect value={sourceId} onChange={(v) => {
              setSourceId(v);
              setSelectedLeadIds([]);
              setDelSelectedLeadIds([]);
            }} placeholder="Select source to operate on" />
          </Field>

          {/* === Tab: Transfer === */}
          {activeTab === "transfer" && (
            <form onSubmit={doTransfer} className="mt-6 space-y-6">
              <Field label="Target Source">
                <SourceSelect value={targetSourceId} onChange={setTargetSourceId} placeholder="Select target source" />
              </Field>

              <div>
                <label className="block text-sm font-medium mb-2">Scope</label>
                <div className="mb-4">
                  <ScopePicker value={scope} onChange={setScope} />
                </div>

                {scope === "by_response" && (
                  <Field label="Responses">
                    <ResponseMulti values={responseIds} onChange={setResponseIds} />
                  </Field>
                )}

                {scope === "lead_ids" && (
                  <>
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
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="e.g. 101,102,103"
                        value={leadIdsText}
                        onChange={(e) => setLeadIdsText(e.target.value)}
                      />
                    </Field>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Field Clearing on Transfer</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearAssigned} onChange={(e) => setClearAssigned(e.target.checked)} />
                    <span className="text-sm">Clear assigned_to_user</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearResponse} onChange={(e) => setClearResponse(e.target.checked)} />
                    <span className="text-sm">Clear response (lead_response_id)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearDates} onChange={(e) => setClearDates(e.target.checked)} />
                    <span className="text-sm">Clear response dates</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  By default all three are cleared and <code>is_old_lead</code> is set to false on transfer.
                </p>
              </div>

              {/* NEW: extra clear options */}
              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium mb-2">Also clear related data (optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearSmsLogs} onChange={(e) => setClearSmsLogs(e.target.checked)} />
                    <span className="text-sm">SMS logs</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearEmailLogs} onChange={(e) => setClearEmailLogs(e.target.checked)} />
                    <span className="text-sm">Email logs</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearComments} onChange={(e) => setClearComments(e.target.checked)} />
                    <span className="text-sm">Comments</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearStories} onChange={(e) => setClearStories(e.target.checked)} />
                    <span className="text-sm">Stories</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={clearRecordings} onChange={(e) => setClearRecordings(e.target.checked)} />
                    <span className="text-sm">Recordings</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-amber-600">
                  Use carefully: these deletions are permanent if your backend performs a hard delete.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {loading ? "Transferring..." : "Transfer Leads"}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}

          {/* === Tab: Delete Leads (in Source) === */}
          {activeTab === "deleteLeads" && (
            <form onSubmit={doDeleteLeads} className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Delete Mode</label>
                <div className="flex gap-4">
                  {["soft", "hard"].map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name="delmode" checked={delMode === m} onChange={() => setDelMode(m)} />
                      <span className="text-sm capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scope</label>
                <ScopePicker value={delScope} onChange={setDelScope} />

                {delScope === "by_response" && (
                  <Field label="Responses">
                    <ResponseMulti values={delResponseIds} onChange={setDelResponseIds} />
                  </Field>
                )}

                {delScope === "lead_ids" && (
                  <>
                    <Field label="Select Leads (from chosen Source)">
                      <LeadMulti
                        sourceId={sourceId}
                        values={delSelectedLeadIds}
                        onChange={setDelSelectedLeadIds}
                      />
                    </Field>
                    <Field label="Or, enter Lead IDs (comma-separated)">
                      <input
                        className="w-full rounded-lg border px-3 py-2"
                        placeholder="e.g. 101,102,103"
                        value={delLeadIdsText}
                        onChange={(e) => setDelLeadIdsText(e.target.value)}
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {loading ? "Deleting..." : "Delete Leads"}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}

          {/* === Tab: Delete/Archive Source === */}
          {activeTab === "deleteSource" && (
            <form onSubmit={doDeleteSource} className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Source Delete Mode</label>
                <div className="flex flex-wrap gap-4">
                  {["soft", "hard"].map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name="srcmode" checked={srcDeleteMode === m} onChange={() => setSrcDeleteMode(m)} />
                      <span className="text-sm capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">On Leads</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "nullify", label: "Nullify lead_source_id" },
                    { value: "delete_soft", label: "Soft delete leads" },
                    { value: "delete_hard", label: "Hard delete leads" },
                  ].map((o) => (
                    <label key={o.value} className="flex items-center gap-2">
                      <input type="radio" name="onleads" checked={onLeads === o.value} onChange={() => setOnLeads(o.value)} />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {srcDeleteMode === "soft" && (
                <Field label="Archive Prefix" hint="Only used for soft delete (archiving).">
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={archivePrefix}
                    onChange={(e) => setArchivePrefix(e.target.value)}
                  />
                </Field>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {loading ? (srcDeleteMode === "soft" ? "Archiving..." : "Deleting...") : (srcDeleteMode === "soft" ? "Archive Source" : "Delete Source")}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-3">Result</h2>
            <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
