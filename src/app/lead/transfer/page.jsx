"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { ChevronDown, ChevronRight, Settings2, Send, Info } from "lucide-react";

const scopes = [
  { value: "all", label: "All leads in this source" },
  { value: "new_only", label: "Only NEW leads (no response set)" },
  { value: "by_response", label: "Filter by response(s)" },
  { value: "lead_ids", label: "Only selected lead IDs" },
];

export default function SourceToolsPage() {
  // tab is just transfer for now
  const [activeTab] = useState("transfer");

  // dropdown data (sources already contain responses per-source)
  const [sources, setSources] = useState([]); // [{id, name, count, responses:[{id,name,count}]}]
  const [responses, setResponses] = useState([]);

  // Common
  const [sourceId, setSourceId] = useState("");

  // ===== Transfer state =====
  const [targetSourceId, setTargetSourceId] = useState("");
  const [scope, setScope] = useState("all");
  const [responseIds, setResponseIds] = useState([]);
  const [leadIdsText, setLeadIdsText] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Clear core flags
  const [clearAssigned, setClearAssigned] = useState(true);
  const [clearResponse, setClearResponse] = useState(true);
  const [clearDates, setClearDates] = useState(true);

  // Clear profile/contact fields
  const [clearName, setClearName] = useState(false);
  const [clearEmail, setClearEmail] = useState(false);
  const [clearMobile, setClearMobile] = useState(false);
  const [clearAddress, setClearAddress] = useState(false);
  const [clearPincode, setClearPincode] = useState(false);
  const [clearCity, setClearCity] = useState(false);
  const [clearState, setClearState] = useState(false);
  const [clearOccupation, setClearOccupation] = useState(false);
  const [clearSegment, setClearSegment] = useState(false);
  const [extraFieldsCsv, setExtraFieldsCsv] = useState("");

  // date window + limit
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [limitCount, setLimitCount] = useState("");
  const [distributeEqual, setDistributeEqual] = useState(false);

  // clear related records
  const [clearSmsLogs, setClearSmsLogs] = useState(false);
  const [clearEmailLogs, setClearEmailLogs] = useState(false);
  const [clearComments, setClearComments] = useState(false);
  const [clearStories, setClearStories] = useState(false);
  const [clearRecordings, setClearRecordings] = useState(false);

  // Result / errors
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // ---------- load sources ONCE (sources already include responses per source) ----------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await axiosInstance.get("/source-tools/options");
        if (!isMounted) return;
        const srcs = Array.isArray(data?.sources) ? data.sources : [];
        setSources(srcs);
      } catch (e) {
        console.error("Failed to load sources", e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // ---------- set responses when source changes (source-wise responses only) ----------
  useEffect(() => {
    setSelectedLeadIds([]);
    setResponseIds([]);
    if (!sourceId) { setResponses([]); return; }
    const sid = Number(sourceId);
    const src = sources.find(s => s.id === sid);
    setResponses(src?.responses || []);
  }, [sourceId, sources]);

  // ---------- helpers ----------
  function parseCsvInts(csv) {
    return (csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => !Number.isNaN(n));
  }

  function parseCsvStrings(csv) {
    return (csv || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  const transferPayload = useMemo(() => {
    const p = {
      scope,
      target_source_id: targetSourceId ? Number(targetSourceId) : undefined,

      // core clears
      clear_assigned: clearAssigned,
      clear_response: clearResponse,
      clear_response_dates: clearDates,

      // profile clears
      clear_name: clearName,
      clear_email: clearEmail,
      clear_mobile: clearMobile,
      clear_address: clearAddress,
      clear_pincode: clearPincode,
      clear_city: clearCity,
      clear_state: clearState,
      clear_occupation: clearOccupation,
      clear_segment: clearSegment,
      extra_fields_to_clear: parseCsvStrings(extraFieldsCsv),

      // related clears
      clear_sms_logs: clearSmsLogs,
      clear_email_logs: clearEmailLogs,
      clear_comments: clearComments,
      clear_stories: clearStories,
      clear_recordings: clearRecordings,
    };

    // date window
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;

    // limit & distribution
    if (limitCount) p.limit_count = Number(limitCount);
    if (distributeEqual) p.distribute_equal_by_assignee = true;

    if (scope === "by_response") p.response_ids = responseIds;
    if (scope === "lead_ids") {
      p.lead_ids =
        selectedLeadIds.length > 0 ? selectedLeadIds : parseCsvInts(leadIdsText);
    }
    return p;
  }, [
    scope, targetSourceId,
    clearAssigned, clearResponse, clearDates,
    clearName, clearEmail, clearMobile, clearAddress, clearPincode, clearCity, clearState, clearOccupation, clearSegment, extraFieldsCsv,
    clearSmsLogs, clearEmailLogs, clearComments, clearStories, clearRecordings,
    fromDate, toDate, limitCount, distributeEqual,
    responseIds, selectedLeadIds, leadIdsText
  ]);

  // ---------- actions ----------
  async function callTransfer(dry_run) {
    setError(""); setResult(null);

    if (!sourceId) return setError("From Source is required.");
    if (!targetSourceId) return setError("Target Source is required.");
    if (scope === "by_response" && (!transferPayload.response_ids || transferPayload.response_ids.length === 0))
      return setError("Select at least one response.");
    if (scope === "lead_ids" && (!transferPayload.lead_ids || transferPayload.lead_ids.length === 0))
      return setError("Select or enter at least one lead ID.");

    const body = { ...transferPayload, dry_run };

    setLoading(true);
    try {
      const { data } = await axiosInstance.post(
        `/source-tools/${Number(sourceId)}/transfer`,
        body
      );
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- UI helpers ----------
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

  const btnSecondary =
    "inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white " +
    "px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-60";

  function SourceSelect({ value, onChange, placeholder = "Select source" }) {
    return (
      <select className={inputBase} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.count})
          </option>
        ))}
      </select>
    );
  }

  function ResponseMulti({ values, onChange }) {
    return (
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
                <span>{r.name} ({r.count})</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <Info className="h-3.5 w-3.5" /> Responses are **source-wise**.
        </p>
      </div>
    );
  }

  function Accordion({ title, icon: Icon = Settings2, defaultOpen = true, children, subtle = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className={`rounded-2xl border ${subtle ? "border-gray-100" : "border-gray-200"} bg-white shadow-sm`}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
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

  function LeadMulti({ sourceId, values, onChange, hint }) {
    const [items, setItems] = useState([]);
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

        {/* Card */}
        <div className="rounded-3xl border border-indigo-100/70 bg-white p-6 shadow-xl shadow-indigo-100/60">
          {/* Source (from) */}
          <div className="mb-6">
            <Field label="Source (from)">
              <SourceSelect
                value={sourceId}
                onChange={(v) => { setSourceId(v); setSelectedLeadIds([]); }}
                placeholder="Select source to operate on"
              />
            </Field>
          </div>

          {/* === Transfer === */}
          {activeTab === "transfer" && (
            <div className="space-y-6 w-full">
              <Accordion title="Target & Scope" icon={Send}>
                <div className="flex flex-col gap-4 w-full">
                  <Field label="Target Source">
                    <SourceSelect value={targetSourceId} onChange={setTargetSourceId} placeholder="Select target source" />
                  </Field>

                  {/* Date range + Limit + Distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="From Date">
                      <input type="date" className={inputBase} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </Field>
                    <Field label="To Date">
                      <input type="date" className={inputBase} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </Field>
                    <Field label="Count (max leads to transfer)">
                      <input type="number" min={1} className={inputBase} value={limitCount} onChange={(e) => setLimitCount(e.target.value)} placeholder="e.g. 10000" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                      <input type="checkbox" className="accent-indigo-600" checked={distributeEqual} onChange={(e) => setDistributeEqual(e.target.checked)} />
                      <span className="text-sm text-gray-800">Distribute equally by current assignee</span>
                    </label>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-800 mb-2">Scope</label>
                    <ScopePicker value={scope} onChange={setScope} />
                  </div>
                </div>

                {scope === "by_response" && (
                  <div className="mt-4">
                    <Field label="Responses (source-wise)">
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

              <Accordion title="Field Clearing on Transfer (core)" icon={Settings2} subtle>
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
                  By default all three are cleared and <code className="rounded bg-gray-100 px-1">is_old_lead</code> false ho jata hai.
                </p>
              </Accordion>

              <Accordion title="Clear Profile / Contact Fields (optional)" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ["Name", clearName, setClearName],
                    ["Email", clearEmail, setClearEmail],
                    ["Mobile", clearMobile, setClearMobile],
                    ["Address", clearAddress, setClearAddress],
                    ["Pincode", clearPincode, setClearPincode],
                    ["City", clearCity, setClearCity],
                    ["State", clearState, setClearState],
                    ["Occupation", clearOccupation, setClearOccupation],
                    ["Segment", clearSegment, setClearSegment],
                  ].map(([label, val, set]) => (
                    <label key={label} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                      <input type="checkbox" className="accent-indigo-600" checked={val} onChange={(e) => set(e.target.checked)} />
                      <span className="text-sm text-gray-800">Clear {label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <Field label="Extra fields to clear (comma-separated)">
                    <input
                      className={inputBase}
                      placeholder="e.g. address_line1,address_line2,zip"
                      value={extraFieldsCsv}
                      onChange={(e) => setExtraFieldsCsv(e.target.value)}
                    />
                  </Field>
                </div>
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
                  Dhyan se use karein — agar backend hard delete karta hai to irreversible hai.
                </p>
              </Accordion>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={loading} className={btnSecondary} onClick={() => callTransfer(true)}>
                  {loading ? "Working..." : "Preview"}
                </button>
                <button type="button" disabled={loading} className={btnPrimary} onClick={() => callTransfer(false)}>
                  {loading ? "Transferring..." : "Transfer Leads"}
                </button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {/* {result && (
          <div className="rounded-3xl border border-indigo-100/70 bg-white p-6 shadow-xl shadow-indigo-100/60">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Result</h2>
            <pre className="overflow-auto rounded-2xl bg-gray-900 p-4 text-sm text-gray-100">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )} */}
      </main>
    </div>
  );
}
