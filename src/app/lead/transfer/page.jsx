"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { ChevronDown, ChevronRight, Settings2, Send, Info } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const scopes = [
  { value: "all", label: "All leads in this source" },
  { value: "new_only", label: "Only NEW leads (no response set)" },
  { value: "by_response", label: "Filter by response(s)" },
];

export default function SourceToolsPage() {
  const { theme } = useTheme(); // triggers re-render on theme change

  // tab is just transfer for now
  const [activeTab] = useState("transfer");

  // dropdown data (server now returns only id/name/count for options)
  const [sources, setSources] = useState([]); // [{id, name, count}]
  const [responses, setResponses] = useState([]); // [{id,name,count}] from response-stats.breakdown

  // response-stats panel state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  // Common
  const [sourceId, setSourceId] = useState("");

  // ===== Transfer state =====
  const [targetSourceId, setTargetSourceId] = useState("");
  const [scope, setScope] = useState("all");
  const [responseIds, setResponseIds] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // Clear core flags
  const [clearAssigned, setClearAssigned] = useState(true);
  const [clearResponse, setClearResponse] = useState(true);
  const [clearDates, setClearDates] = useState(true);

  // Clear profile/contact fields
  const [clearName, setClearName] = useState(false);
  const [clearEmail, setClearEmail] = useState(false);
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
  const [clearSmsLogs, setClearSmsLogs] = useState(true);
  const [clearEmailLogs, setClearEmailLogs] = useState(true);
  const [clearComments, setClearComments] = useState(true);
  const [clearStories, setClearStories] = useState(true);
  const [clearRecordings, setClearRecordings] = useState(true);

  // Result / errors
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // ---------- load sources ONCE ----------
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

  // ---------- fetch response-stats whenever source or date range changes ----------
  useEffect(() => {
    let cancel = false;
    async function loadStats() {
      setStats(null);
      setResponses([]);
      setStatsError("");
      if (!sourceId) return;
      setStatsLoading(true);
      try {
        const params = { source_id: Number(sourceId) };
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        const { data } = await axiosInstance.get("/source-tools/response-stats", { params });
        if (cancel) return;
        setStats(data || null);
        // feed breakdown to responses list for UI (ResponseMulti)
        const breakdown = Array.isArray(data?.breakdown) ? data.breakdown : [];
        setResponses(breakdown.map(b => ({ id: b.response_id, name: b.response_name, count: b.count })));
      } catch (e) {
        if (!cancel) {
          setStats(null);
          setResponses([]);
          setStatsError(e?.response?.data?.detail || e.message || "Failed to fetch stats");
        }
      } finally {
        if (!cancel) setStatsLoading(false);
      }
    }
    loadStats();
    return () => { cancel = true; };
  }, [sourceId, fromDate, toDate]);

  // Reset selections when source changes
  useEffect(() => {
    setSelectedLeadIds([]);
    setResponseIds([]);
  }, [sourceId]);

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
    return p;
  }, [
    scope, targetSourceId,
    clearAssigned, clearResponse, clearDates,
    clearName, clearEmail, clearAddress, clearPincode, clearCity, clearState, clearOccupation, clearSegment, extraFieldsCsv,
    clearSmsLogs, clearEmailLogs, clearComments, clearStories, clearRecordings,
    fromDate, toDate, limitCount, distributeEqual,
    responseIds, selectedLeadIds
  ]);

  // ---------- actions ----------
  async function callTransfer(dry_run) {
    setError(""); setResult(null);

    if (!sourceId) return setError("From Source is required.");
    if (!targetSourceId) return setError("Target Source is required.");
    if (scope === "by_response" && (!transferPayload.response_ids || transferPayload.response_ids.length === 0))
      return setError("Select at least one response.");

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

  // ---------- UI helpers (themed) ----------
  function Field({ label, children, hint }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--theme-text)]">{label}</label>
        {children}
        {hint ? <p className="mt-0.5 text-xs text-[var(--theme-text-muted)]">{hint}</p> : null}
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
                  border-[var(--theme-border)] hover:border-[var(--theme-border)]
                  peer-checked:border-[var(--theme-primary)]
                  peer-checked:ring-2 peer-checked:ring-[var(--theme-primary-soft)]
                  peer-checked:bg-[var(--theme-primary-softer)]
                  text-[var(--theme-text)] text-center whitespace-normal
                  bg-[var(--theme-card-bg)]
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
    "w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-input-background)] px-3 py-2 text-sm text-[var(--theme-text)] shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-soft)] focus:border-[var(--theme-primary)] transition placeholder-[var(--theme-text-muted)]";

  const btnPrimary =
    "inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] " +
    "px-4 py-2 text-sm font-medium text-[var(--theme-primary-contrast)] shadow transition disabled:opacity-60";

  const btnSecondary =
    "inline-flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] " +
    "px-4 py-2 text-sm font-medium text-[var(--theme-text)] shadow-sm hover:bg-[var(--theme-primary-softer)] transition disabled:opacity-60";

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
      <div className="rounded-xl border border-[var(--theme-border)] p-3 shadow-sm bg-[var(--theme-card-bg)]">
        <div className="flex flex-col gap-2">
          {responses.map((r) => {
            const checked = values.includes(r.id);
            return (
              <label
                key={r.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm transition
                ${checked
                  ? "border-[var(--theme-primary)] bg-[var(--theme-primary-softer)]"
                  : "border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]/60"} text-[var(--theme-text)]`}
              >
                <input
                  type="checkbox"
                  className="accent-[var(--theme-primary)]"
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
        <p className="mt-2 text-xs text-[var(--theme-text-muted)] flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-[var(--theme-text-muted)]" /> Counts reflect current filters (source & date range).
        </p>
      </div>
    );
  }

  function Accordion({ title, icon: Icon = Settings2, defaultOpen = true, children, subtle = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className={`rounded-2xl border ${subtle ? "border-[var(--theme-border)]/60" : "border-[var(--theme-border)]"} bg-[var(--theme-card-bg)] shadow-sm`}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-[var(--theme-primary)]" /> : <ChevronRight className="h-4 w-4 text-[var(--theme-primary)]" />}
            <span className="text-sm font-semibold text-[var(--theme-text)] flex items-center gap-2">
              <Icon className="h-4 w-4 text-[var(--theme-primary)]" />
              {title}
            </span>
          </div>
        </button>
        {open && <div className="px-4 pb-4 pt-2">{children}</div>}
      </div>
    );
  }

  // Build a quick lookup: response_id -> count (already date-filtered by API)
const breakdownMap = useMemo(() => {
  const map = {};
  (stats?.breakdown || []).forEach((b) => { map[b.response_id] = b.count || 0; });
  return map;
}, [stats]);

// What number should we show for the chosen scope?
const scopeCount = useMemo(() => {
  if (!stats) return null;
  if (scope === "all") return stats.total ?? 0;
  if (scope === "new_only") return stats.new_count ?? 0;
  if (scope === "by_response") {
    if (!responseIds?.length) return 0;
    return responseIds.reduce((sum, id) => sum + (breakdownMap[id] || 0), 0);
  }
  return null;
}, [stats, scope, responseIds, breakdownMap]);

// Label to show above the count
const scopeCountLabel = useMemo(() => {
  if (scope === "all") return "Total";
  if (scope === "new_only") return "NEW (no response)";
  return "Selected responses";
}, [scope]);


  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)]">
      <main className="mx-2 px-4 py-6 space-y-6">

        {/* Card */}
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-xl">
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

                  {/* Date range + Limit + Distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Field label="From Date">
                      <input type="date" className={inputBase} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </Field>
                    <Field label="To Date">
                      <input type="date" className={inputBase} value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </Field>
                    <Field label="Count (max leads to transfer)">
                      <input type="number" min={1} className={inputBase} value={limitCount} onChange={(e) => setLimitCount(e.target.value)} placeholder="e.g. 10000" />
                    </Field>
                    <div className="">
                    <Field label="Distribute equally by current assignee">
                      <div className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-input-background)] px-3 py-2 text-sm text-[var(--theme-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-soft)] focus:border-[var(--theme-primary)] transition placeholder-[var(--theme-text-muted)] flex gap-2">
                      <input type="checkbox" checked={distributeEqual} onChange={(e) => setDistributeEqual(e.target.checked)} />
                      <span className="text-sm text-[var(--theme-text)]">Distribute equally</span>
                      </div>
                    </Field>
                  </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Scope</label>
                    <ScopePicker value={scope} onChange={setScope} />
                  </div>
                </div>

                            {/* Response-stats panel (appears after selecting source) */}
            {sourceId ? (
             <div className="mt-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {/* Scope-aware count */}
      <div className="rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-border)] p-3">
        <div className="text-xs text-[var(--theme-text-muted)]">{scopeCountLabel}</div>
        <div className="text-lg font-semibold text-[var(--theme-text)]">
          {statsLoading ? "…" : (scopeCount ?? "—")}
        </div>
      </div>

      {/* Keep these as reference info */}
      <div className="rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-border)] p-3">
        <div className="text-xs text-[var(--theme-text-muted)]">Total (all)</div>
        <div className="text-lg font-semibold text-[var(--theme-text)]">
          {statsLoading ? "…" : (stats?.total ?? "—")}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-border)] p-3">
        <div className="text-xs text-[var(--theme-text-muted)]">NEW (no response)</div>
        <div className="text-lg font-semibold text-[var(--theme-text)]">
          {statsLoading ? "…" : (stats?.new_count ?? "—")}
        </div>
      </div>
    </div>
</div>

            ) : null}

                {scope === "by_response" && (
                  <div className="mt-4">
                    <Field label="Responses (from response-stats)">
                      <ResponseMulti values={responseIds} onChange={setResponseIds} />
                    </Field>
                  </div>
                )}
              </Accordion>

              <Accordion title="Field Clearing on Transfer (core)" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] px-3 py-2 hover:bg-[var(--theme-primary-softer)] bg-[var(--theme-surface)]">
                    <input type="checkbox" className="accent-[var(--theme-primary)]" checked={clearAssigned} onChange={(e) => setClearAssigned(e.target.checked)} />
                    <span className="text-sm text-[var(--theme-text)]">Clear assigned_to_user</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] px-3 py-2 hover:bg-[var(--theme-primary-softer)] bg-[var(--theme-surface)]">
                    <input type="checkbox" className="accent-[var(--theme-primary)]" checked={clearResponse} onChange={(e) => setClearResponse(e.target.checked)} />
                    <span className="text-sm text-[var(--theme-text)]">Clear response (lead_response_id)</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] px-3 py-2 hover:bg-[var(--theme-primary-softer)] bg-[var(--theme-surface)]">
                    <input type="checkbox" className="accent-[var(--theme-primary)]" checked={clearDates} onChange={(e) => setClearDates(e.target.checked)} />
                    <span className="text-sm text-[var(--theme-text)]">Clear response dates</span>
                  </label>
                </div>
                <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
                  By default all three are cleared and <code className="rounded px-1 bg-[var(--theme-primary-softer)]">is_old_lead</code> false ho jata hai.
                </p>
              </Accordion>

              <Accordion title="Clear Profile / Contact Fields (optional)" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ["Name", clearName, setClearName],
                    ["Email", clearEmail, setClearEmail],
                    ["Address", clearAddress, setClearAddress],
                    ["Pincode", clearPincode, setClearPincode],
                    ["City", clearCity, setClearCity],
                    ["State", clearState, setClearState],
                    ["Occupation", clearOccupation, setClearOccupation],
                    ["Segment", clearSegment, setClearSegment],
                  ].map(([label, val, set]) => (
                    <label key={label} className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] px-3 py-2 hover:bg-[var(--theme-primary-softer)] bg-[var(--theme-surface)]">
                      <input type="checkbox" className="accent-[var(--theme-primary)]" checked={val} onChange={(e) => set(e.target.checked)} />
                      <span className="text-sm text-[var(--theme-text)]">Clear {label}</span>
                    </label>
                  ))}
                </div>
              </Accordion>

              <Accordion title="Also clear related data (optional)" icon={Settings2} subtle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    ["SMS logs", clearSmsLogs, setClearSmsLogs],
                    ["Email logs", clearEmailLogs, setClearEmailLogs],
                    ["Comments", clearComments, setClearComments],
                    ["Stories", clearStories, setClearStories],
                    ["Recordings", clearRecordings, setClearRecordings],
                  ].map(([label, val, set]) => (
                    <label key={label} className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] px-3 py-2 hover:bg-[var(--theme-primary-softer)] bg-[var(--theme-surface)]">
                      <input type="checkbox" className="accent-[var(--theme-primary)]" checked={val} onChange={(e) => set(e.target.checked)} />
                      <span className="text-sm text-[var(--theme-text)]">{label}</span>
                    </label>
                  ))}
                </div>
              </Accordion>

                                <Field label="Target Source">
                    <SourceSelect value={targetSourceId} onChange={setTargetSourceId} placeholder="Select target source" />
                  </Field>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={loading} className={btnSecondary} onClick={() => callTransfer(true)}>
                  {loading ? "Working..." : "Preview"}
                </button>
                <button type="button" disabled={loading} className={btnPrimary} onClick={() => callTransfer(false)}>
                  {loading ? "Transferring..." : "Transfer Leads"}
                </button>
                {error && <span className="text-sm text-[var(--theme-danger)]">{error}</span>}
              </div>
            </div>
          )}
          
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--theme-text)] mb-3">Result</h2>
            <pre className="overflow-auto rounded-2xl bg-[var(--theme-surface)] p-4 text-sm text-[var(--theme-text)]">
{JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
