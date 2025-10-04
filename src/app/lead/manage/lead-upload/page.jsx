"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";

// lucide icons
import {
  ArrowDownToLine,
  Database,
  Upload,
  FolderOpen,
  Link as LinkIcon,
  Settings2,
  Building2,
  Tag,
  BarChart3,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Target,
  Briefcase,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function BulkUploadPage() {
  const router = useRouter();
  const { theme, themeConfig, toggleTheme } = useTheme();

  // mode: "file" | "paste"
  const [mode, setMode] = useState("file");

  // state
  const [branches, setBranches] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // file state
  const [selectedFile, setSelectedFile] = useState(null);

  // paste state
  const [pasteText, setPasteText] = useState("");

  // auth-derived
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);

  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const isSuperAdmin = role === "SUPERADMIN";

  const myBranch = useMemo(
    () => branches.find((b) => String(b.id) === String(branchId)),
    [branches, branchId]
  );

  // --- helpers for paste mode ---
  const normalizeMobiles = (text) => {
    const tokens = String(text || "").split(/[,\s;|/]+/g);
    const out = [];
    const seen = new Set();
    for (const t of tokens) {
      if (!t) continue;
      const digits = t.replace(/\D/g, "");
      if (digits.length >= 10) {
        const last10 = digits.slice(-10); // keep last 10 (Indian format)
        if (!seen.has(last10)) {
          seen.add(last10);
          out.push(last10);
        }
      }
    }
    return out;
  };

  const pastedMobiles = useMemo(() => normalizeMobiles(pasteText), [pasteText]);

  // read user_info + fetch branches & lead sources
  useEffect(() => {
    try {
      const raw = Cookies.get("user_info");
      if (raw) {
        const u = JSON.parse(raw);

        const r =
          u?.role_name ||
          u?.role ||
          u?.user?.role_name ||
          u?.user?.role ||
          u?.user_info?.role_name ||
          u?.user_info?.role ||
          null;

        const b =
          u?.branch_id ||
          u?.branch?.id ||
          u?.user?.branch_id ||
          u?.user?.branch?.id ||
          u?.user_info?.branch_id ||
          u?.user_info?.branch?.id ||
          null;

        setRole(String(r).toUpperCase());
        const branchStr = b ? String(b) : null;
        setBranchId(branchStr);
        setSelectedBranchId(branchStr); // lock initial selected branch for non-superadmins
      }
    } catch (e) {
      console.warn("Failed to parse user_info cookie:", e);
    }

    (async () => {
      try {
        const { data } = await axiosInstance.get(
          "/branches/?skip=0&limit=100&active_only=false"
        );
        setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load branches:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;

    (async () => {
      try {
        // Preferred: server filters by branch (if supported by your API)
        const { data } = await axiosInstance.get(
          `/lead-config/sources/?skip=0&limit=100&branch_id=${selectedBranchId}`
        );
        setLeadSources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Branch-filtered lead sources failed, falling back:", err);
        // Fallback: fetch all, we’ll filter client-side (see visibleSources below)
        try {
          const { data } = await axiosInstance.get(`/lead-config/sources/?skip=0&limit=100`);
          setLeadSources(Array.isArray(data) ? data : []);
        } catch (e2) {
          console.error("Failed to load any lead sources:", e2);
        }
      }
    })();
  }, [selectedBranchId]);

  useEffect(() => {
    if (!isSuperAdmin && branchId) setSelectedBranchId(branchId);
  }, [isSuperAdmin, branchId]);

  const visibleSources = useMemo(() => {
    if (!selectedBranchId) return leadSources;

    // Accept either `source.branch_id` or `source.branches: [{id}]`
    return leadSources.filter(
      (s) =>
        String(s?.branch_id) === String(selectedBranchId) ||
        (Array.isArray(s?.branches) &&
          s.branches.some((b) => String(b?.id) === String(selectedBranchId)))
    );
  }, [leadSources, selectedBranchId]);

  // submit (handles both modes)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build a fresh FormData to keep full control
    const formEl = e.target;
    const fd = new FormData();

    // required config fields
    const branch_id = formEl.branch_id?.value || "";
    const lead_source_id = formEl.lead_source_id?.value || "";
    if (!branch_id) return alert("Please select a branch.");
    if (!lead_source_id) return alert("Please select a lead source.");

    fd.append("branch_id", branch_id);
    fd.append("lead_source_id", lead_source_id);

    if (mode === "file") {
      // from actual input
      const file = formEl.upload_file?.files?.[0] || null;
      if (!file) return alert("Please choose a CSV/XLSX file.");
      fd.append("upload_file", file);

      // column mapping (optional)
      const mapFields = [
        "name_column",
        "mobile_column",
        "email_column",
        "address_column",
        "city_column",
        "segment_column",
        "occupation_column",
        "investment_column",
      ];
      for (const key of mapFields) {
        const val = formEl[key]?.value?.trim();
        if (val) fd.append(key, val);
      }
    } else {
      // mode === "paste"
      const mobiles = pastedMobiles;
      if (!mobiles.length) return alert("Please paste at least one valid mobile number.");

      // build a CSV with a single "mobile" column
      const csvContent = mobiles.map((m) => m).join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv" });

      // attach as a file so backend path stays the same
      fd.append("upload_file", blob, "pasted_mobiles.csv");

      // force mobile column to 0 as requested
      fd.append("mobile_column", "0");
      // other mappings optional
    }

    try {
      setUploading(true);
      const { data } = await axiosInstance.post("/bulk-leads/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(data);
      if (mode === "paste") setPasteText("");
      if (mode === "file") setSelectedFile(null);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  // download error rows as CSV
  const downloadErrorsAsCSV = () => {
    const errs = Array.isArray(uploadResult?.errors) ? uploadResult.errors : [];
    if (!errs.length) return;

    const sampleData = errs.find((e) => e?.data)?.data || {};
    const presentKeys = ERROR_DATA_KEYS.filter((k) => k in sampleData);

    const headers = [
      "Row",
      "Existing Lead ID",
      ...presentKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
      "Errors",
    ];

    const rows = errs.map((err) => {
      const dataArr = normalizeErrorData(err?.data, presentKeys);
      const errText = Array.isArray(err?.errors)
        ? err.errors.join("; ")
        : err?.errors ?? "";
      return [err?.row ?? "", err?.existing_lead_id ?? "", ...dataArr, errText];
    });

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((r) => r.map(csvEscape).join(",")),
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "duplicate_or_error_rows.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // column mapping meta (icons instead of emojis)
  const columnFields = [
    { name: "name_column", label: "Name Column", Icon: User },
    { name: "mobile_column", label: "Mobile Column", Icon: Phone },
    { name: "email_column", label: "Email Column", Icon: Mail },
    { name: "address_column", label: "Address Column", Icon: MapPin },
    { name: "city_column", label: "City Column", Icon: Building },
    { name: "segment_column", label: "Segment Column", Icon: Target },
    { name: "occupation_column", label: "Occupation Column", Icon: Briefcase },
    { name: "investment_column", label: "Investment Column", Icon: IndianRupee },
  ];

  // ---- CSV helpers ----
  function csvEscape(val) {
    if (val == null) return "";
    const s = String(val).replace(/"/g, '""');
    return /[",\r\n]/.test(s) ? `"${s}"` : s;
  }

  const ERROR_DATA_KEYS = [
    "name",
    "mobile",
    "email",
    "city",
    "address",
    "segment",
    "occupation",
    "investment",
    "pan",
  ];

  function normalizeErrorData(data, keys = ERROR_DATA_KEYS) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      return keys.map((k) => data[k] ?? "");
    }
    return [];
  }

  return (
    <div className="min-h-screen p-6 bg-[var(--theme-background)] text-[var(--theme-text)]">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Upload Form */}
        <div className="flex-1 rounded-2xl shadow p-6 overflow-y-auto bg-[var(--theme-surface)] border border-[var(--theme-border)]">
          {/* Tabs */}
          <div className="mb-5 flex w-full">
            <div className="inline-flex rounded-lg border border-[var(--theme-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("file")}
                className={`px-4 py-2 text-sm font-medium transition ${
                  mode === "file"
                    ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
                    : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                }`}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`px-4 py-2 text-sm font-medium border-l border-[var(--theme-border)] transition ${
                  mode === "paste"
                    ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
                    : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                }`}
              >
                Paste Upload
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File or Paste */}
            {mode === "file" ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                  <FolderOpen className="text-[var(--theme-primary)] w-5 h-5" />
                  Select File
                </h2>

                <label htmlFor="upload_file"
                 className={`flex items-center justify-between px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition
   ${
     selectedFile
       ? "border-[var(--theme-components-tag-success-border)] bg-[var(--theme-components-tag-success-bg)] text-[var(--theme-components-tag-success-text)]"
       : "border-[var(--theme-components-tag-info-border)] bg-[var(--theme-components-tag-info-bg)] text-[var(--theme-components-tag-info-text)]"
   }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {selectedFile ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {selectedFile.name}
                      </>
                    ) : (
                      <>
                        
                        Choose a file
                      </>
                    )}
                  </span>
                  <input
                  id="upload_file"
                    type="file"
                    name="upload_file"
                    accept=".csv,.xlsx"
                    required={mode === "file"}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="sr-only" 
                  />
                </label>
              </section>
            ) : (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                  <Phone className="text-[var(--theme-primary)] w-5 h-5" />
                  Paste Mobiles
                </h2>
                <textarea
                  name="pasted_mobiles"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Examples:
0919876543210
091 98765 43210
091 98765-43210
91 98765 43210, 919876543210
+91 98765 43210, 91234-56789
(91) 98989 89898 97979 79797
`}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg transition
                             bg-[var(--theme-components-input-bg)]
                             text-[var(--theme-components-input-text)]
                             border border-[var(--theme-components-input-border)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                  required={mode === "paste"}
                />
                <div className="text-sm text-[var(--theme-text-muted)]">
                  Detected:{" "}
                  <span className="font-semibold text-[var(--theme-text)]">
                    {pastedMobiles.length}
                  </span>{" "}
                  mobile{pastedMobiles.length === 1 ? "" : "s"}
                </div>
              </section>
            )}

            {/* Column Mapping (file mode only) */}
            {mode === "file" && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                  <LinkIcon className="text-[var(--theme-primary)] w-5 h-5" />
                  Column Mapping
                </h2>
                <p className="text-sm text-[var(--theme-text-muted)]">
                  Enter column numbers for each field
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {columnFields.map(({ name, label, Icon }) => (
                    <div key={name} className="space-y-1">
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)]">
                        <Icon className="w-4 h-4 text-[var(--theme-primary)]" />
                        {label}
                      </label>
                      <input
                        type="number"
                        name={name}
                        placeholder="Column #"
                        className="w-full px-4 py-2 rounded-lg transition
                                   bg-[var(--theme-components-input-bg)]
                                   text-[var(--theme-components-input-text)]
                                   placeholder:text-[var(--theme-components-input-placeholder)]
                                   border border-[var(--theme-components-input-border)]
                                   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Configuration */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                <Settings2 className="text-[var(--theme-primary)] w-5 h-5" />
                Configuration
              </h2>

              <div
                className={`grid grid-cols-1 ${
                  isSuperAdmin ? "md:grid-cols-2" : "md:grid-cols-1"
                } gap-4`}
              >
                {/* Branch (dropdown only for SUPERADMIN) */}
                {isSuperAdmin ? (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)]">
                      <Building2 className="w-4 h-4 text-[var(--theme-primary)]" />
                      Select Branch
                    </label>
                    <select
                      name="branch_id"
                      required
                      className="w-full px-4 py-2 rounded-lg transition
                                 bg-[var(--theme-components-input-bg)]
                                 text-[var(--theme-components-input-text)]
                                 border border-[var(--theme-components-input-border)]
                                 focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                      value={selectedBranchId || ""}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                    >
                      <option value="" disabled>
                        {branches.length ? "Choose a branch…" : "Loading branches…"}
                      </option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input type="hidden" name="branch_id" value={branchId ?? ""} />
                )}

                {/* Lead source dropdown */}
                <div className="space-y-1 w-full">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text)]">
                    <Tag className="w-4 h-4 text-[var(--theme-primary)]" />
                    Select Lead Source
                  </label>
                  <select
                    name="lead_source_id"
                    required
                    className="w-full px-4 py-2 rounded-lg transition
                               bg-[var(--theme-components-input-bg)]
                               text-[var(--theme-components-input-text)]
                               border border-[var(--theme-components-input-border)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    defaultValue=""
                    disabled={!selectedBranchId}
                  >
                    <option value="" disabled>
                      {selectedBranchId ? "Choose a source…" : "Pick a branch first…"}
                    </option>
                    {visibleSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading || (mode === "paste" && pastedMobiles.length === 0)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg transition shadow-sm
                         text-[var(--theme-components-button-primary-text)]
                         bg-[var(--theme-components-button-primary-bg)]
                         hover:bg-[var(--theme-components-button-primary-hoverBg)] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {mode === "file" ? "Upload CSV" : "Upload Pasted Mobiles"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Results */}
        <div className="w-full lg:w-96 rounded-2xl shadow p-6 overflow-y-auto bg-[var(--theme-surface)] border border-[var(--theme-border)]">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--theme-text)]">
            <BarChart3 className="text-[var(--theme-primary)] w-5 h-5" />
            Upload Summary
          </h2>
          <div aria-live="polite" className="sr-only">
  {uploading ? "Uploading..." : uploadResult ? "Upload complete." : ""}
  {uploadResult?.errors?.length ? "Some rows had errors." : ""}
</div>

          {!uploadResult ? (
            <div className="text-center mt-12 text-[var(--theme-text-muted)]">
              <Database className="mx-auto mb-4 w-16 h-16 text-[var(--theme-border)]" />
              <p className="font-medium text-[var(--theme-text)]">No upload results yet</p>
              <p className="text-sm">Submit a file or paste mobiles to see the summary here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="rounded-xl p-4 border
                bg-[var(--theme-components-tag-success-bg)]
                border-[var(--theme-components-tag-success-border)]">
                <div className="flex justify-between mb-3">
                  <span className="font-semibold text-[var(--theme-components-tag-success-text)]">Success Rate</span>
<span className="text-2xl font-bold text-[var(--theme-components-tag-success-text)]">
                    {Math.max(0,
   Number.isFinite(
     (uploadResult?.successful_uploads ?? 0) / (uploadResult?.total_rows || 0)
   )
     ? Math.round(((uploadResult?.successful_uploads ?? 0) / (uploadResult?.total_rows || 1)) * 100)
     : 0
 )}
                    %
                  </span>
                </div>
                {[
                  ["Total Rows", uploadResult.total_rows],
                  ["Successfully Uploaded", uploadResult.successful_uploads],
                  ["Duplicates Skipped", uploadResult.duplicates_skipped],
                  ["Errors", uploadResult.errors?.length],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm text-[var(--theme-text-muted)]">
                    <span>{label}</span>
                    <span className="font-semibold text-[var(--theme-text)]">{val ?? 0}</span>
                  </div>
                ))}
              </div>

              {/* Errors */}
              {uploadResult.errors?.length > 0 && (
  <div className="rounded-xl p-4 border
                   bg-[var(--theme-components-tag-error-bg)]
                  border-[var(--theme-components-tag-error-border)]">
                  <h3 className="flex items-center gap-2 font-semibold
                 text-[var(--theme-components-tag-error-text)] mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    Error Details
                  </h3>
                  <ul className="max-h-48 overflow-y-auto space-y-2 text-sm text-[var(--theme-text)]">
                    {uploadResult.errors.map((err) => (
                      <li key={err.row} className="flex gap-2">
                        <span className="font-semibold text-[var(--theme-error)]">
                          Row {err.row}:
                        </span>
                        <span>
                          {Array.isArray(err.errors)
                            ? err.errors.join(", ")
                            : err.errors || "Unknown error"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={downloadErrorsAsCSV}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg transition shadow-sm
            text-[var(--theme-components-button-secondary-text)]
            bg-[var(--theme-components-button-secondary-bg)]
            hover:bg-[var(--theme-components-button-secondary-hoverBg)]"
                  >
                    <ArrowDownToLine className="w-5 h-5" />
                    Download Errors file
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
