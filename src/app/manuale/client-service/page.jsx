"use client";
import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  Send,
  Info,
  Building2,
  Tag,
  UploadCloud,
} from "lucide-react";

const Page = () => {
  const [leadSources, setLeadSources] = useState([]);
  const [responses, setResponses] = useState([]);

  // --- Import form state ---
  const [selectedLeadSourceId, setSelectedLeadSourceId] = useState("");
  const [selectedResponseId, setSelectedResponseId] = useState("");
  const [file, setFile] = useState(null);
  const [oneBased, setOneBased] = useState(true); // “Column #” inputs are 1-based by UX
  const [dryRun, setDryRun] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  // Column # inputs
  const [col, setCol] = useState({
    client_name: "",
    client_phone: "",
    client_email: "",
    address: "",
    city: "",
    segment: "",
    occupation: "",
    investment: "",
    service_type: "",
    duration: "",
    total: "",
    pan: "",
    dob: "",
    start_date: "",
    end_date: "",
    call_count: "",
    plan_type: "",
  });

  // build visible sources if API fallback returns all
  const visibleSources = useMemo(() => {
    if (!Array.isArray(leadSources)) return [];
    return leadSources
  }, [leadSources]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get(
          `/lead-config/sources/?skip=0&limit=100`
        );
        setLeadSources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("lead sources failed, falling back:", err);
        try {
          const { data } = await axiosInstance.get(`/lead-config/sources/?skip=0&limit=100`);
          setLeadSources(Array.isArray(data) ? data : []);
        } catch (e2) {
          console.error("Failed to load any lead sources:", e2);
        }
      }
    })();
  }, []);

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

  // --- helpers for import ---
  const toIntOrNull = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const buildColumnMapJSON = () => {
    // Only include keys that the user provided (skip empty)
    const map = {};
    Object.entries(col).forEach(([k, v]) => {
      const n = toIntOrNull(v);
      if (n !== null) map[k] = n; // backend will convert to 0-based if oneBased=true
    });
    return JSON.stringify(map);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!file) {
      alert("Please choose CSV/XLSX file.");
      return;
    }
    if (!selectedLeadSourceId) {
      alert("Please select a lead source.");
      return;
    }
    if (!selectedResponseId) {
      alert("Please select a response.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("lead_response_id", String(selectedResponseId));
    form.append("lead_source_id", String(selectedLeadSourceId));
    form.append("column_map_json", buildColumnMapJSON());
    form.append("one_based", String(Boolean(oneBased)));
    form.append("dry_run", String(Boolean(dryRun)));

    setImporting(true);
    try {
      const { data } = await axiosInstance.post("/migration/legacy/import-clients", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-8">
      {/* Top filters */}
      <div className={`gap-4`}>

        {/* Lead source dropdown */}
        <div className="space-y-1 w-full">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)]">
            <Tag className="w-4 h-4 text-[var(--theme-primary)]" />
            Select Lead Source
          </label>
          <select
            name="lead_source_id"
            required
            className="w-full px-4 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
            value={selectedLeadSourceId}
            onChange={(e) => setSelectedLeadSourceId(e.target.value)}
          >
            <option value="" disabled>
              Choose a source…
            </option>
            {visibleSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Response dropdown */}
        <div className="space-y-1 w-full md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)]">
            <Info className="w-4 h-4 text-[var(--theme-primary)]" />
            Select Response (applied to all rows)
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
            value={selectedResponseId}
            onChange={(e) => setSelectedResponseId(e.target.value)}
          >
            <option value="">Select Response</option>
            {responses.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Import form */}
      <form onSubmit={handleImport} className="space-y-4">
        {/* File + options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[var(--theme-text)]">Upload CSV/XLSX</label>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-components-input-border)] bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)]"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={oneBased} onChange={(e) => setOneBased(e.target.checked)} />
            <span>Columns are 1-based (Excel style)</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <span>Dry run (don’t write to DB)</span>
          </label>
        </div>

        {/* Column # grid — match your screenshot fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* left */}
          <InputCol label="Name Column" value={col.client_name} onChange={(v) => setCol((p) => ({ ...p, client_name: v }))} />
          <InputCol label="Mobile Column" value={col.client_phone} onChange={(v) => setCol((p) => ({ ...p, client_phone: v }))} />
          <InputCol label="Email Column" value={col.client_email} onChange={(v) => setCol((p) => ({ ...p, client_email: v }))} />
          <InputCol label="Address Column" value={col.address} onChange={(v) => setCol((p) => ({ ...p, address: v }))} />
          <InputCol label="City Column" value={col.city} onChange={(v) => setCol((p) => ({ ...p, city: v }))} />
          <InputCol label="Segment Column" value={col.segment} onChange={(v) => setCol((p) => ({ ...p, segment: v }))} />
          <InputCol label="Occupation Column" value={col.occupation} onChange={(v) => setCol((p) => ({ ...p, occupation: v }))} />
          <InputCol label="Investment Column" value={col.investment} onChange={(v) => setCol((p) => ({ ...p, investment: v }))} />

          {/* service-related */}
          <InputCol label="Service Type Column" value={col.service_type} onChange={(v) => setCol((p) => ({ ...p, service_type: v }))} />
          <InputCol label="Duration Column" value={col.duration} onChange={(v) => setCol((p) => ({ ...p, duration: v }))} />
          <InputCol label="Total (Price) Column" value={col.total} onChange={(v) => setCol((p) => ({ ...p, total: v }))} />
          <InputCol label="Plan Type Column" value={col.plan_type} onChange={(v) => setCol((p) => ({ ...p, plan_type: v }))} />

          {/* identity + dates */}
          <InputCol label="PAN Column" value={col.pan} onChange={(v) => setCol((p) => ({ ...p, pan: v }))} />
          <InputCol label="DOB Column" value={col.dob} onChange={(v) => setCol((p) => ({ ...p, dob: v }))} />
          <InputCol label="Start Date Column" value={col.start_date} onChange={(v) => setCol((p) => ({ ...p, start_date: v }))} />
          <InputCol label="End Date Column" value={col.end_date} onChange={(v) => setCol((p) => ({ ...p, end_date: v }))} />
          <InputCol label="Call Count Column" value={col.call_count} onChange={(v) => setCol((p) => ({ ...p, call_count: v }))} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 disabled:opacity-60"
          >
            <UploadCloud className="w-4 h-4" />
            {importing ? "Importing…" : dryRun ? "Preview Import" : "Import Clients"}
          </button>
          <span className="text-xs opacity-80">
            We’ll set <b>is_client</b> and <b>is_old_lead</b> = true for all imported rows.
          </span>
        </div>
      </form>

      {/* Result summary */}
      {result && (
        <div className="mt-4 rounded-lg border border-[var(--theme-components-input-border)] p-4">
          <div className="font-semibold mb-2">Import Summary</div>
          <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>Rows: {result?.summary?.rows_received ?? 0}</div>
            <div>Leads Created: {result?.summary?.leads_created ?? 0}</div>
            <div>Leads Updated: {result?.summary?.leads_updated ?? 0}</div>
            <div>Static Services: {result?.summary?.static_services_created ?? 0}</div>
            <div>Errors: {result?.summary?.errors ?? 0}</div>
            <div>Dry Run: {String(result?.summary?.dry_run)}</div>
          </div>
          {!!(result?.errors?.length) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm underline">First few errors</summary>
              <pre className="text-xs mt-2 whitespace-pre-wrap">
                {JSON.stringify(result.errors.slice(0, 10), null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

// Small input component for “Column #”
function InputCol({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-[var(--theme-text)]">{label}</label>
      <input
        type="number"
        min={1}
        step={1}
        placeholder="Column #"
        className="w-full px-4 py-2 rounded-lg bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default Page;
