// components/BulkUserUploadModal.jsx
"use client";

import { useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { X, FileUp, CheckCircle2, AlertTriangle, Download } from "lucide-react";

export default function BulkUserUploadModal({
  isOpen,
  onClose,
  onSuccess,
  roles = [],
  branches = [],
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);

  // Forced role & branch (applied to all rows on backend)
  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState("");

  const disabled = !file || uploading || !roleId || !branchId;

  const resetState = () => {
    setFile(null);
    setUploading(false);
    setDryRunResult(null);
    setFinalResult(null);
    setRoleId("");
    setBranchId("");
  };

  const closeAll = () => {
    resetState();
    onClose?.();
  };

  if (!isOpen) return null;

  const appendCommon = (fd) => {
    // backend overrides every row using these values
    fd.append("force_role_id", String(roleId));
    fd.append("force_branch_id", String(branchId));
  };

  const handleValidate = async () => {
    if (!file) return ErrorHandling({ defaultError: "Please choose a CSV or XLSX file." });
    if (!roleId) return ErrorHandling({ defaultError: "Please select a Role." });
    if (!branchId) return ErrorHandling({ defaultError: "Please select a Branch." });

    setUploading(true);
    setDryRunResult(null);
    setFinalResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      appendCommon(fd);
      const res = await axiosInstance.post("/users/bulk?dry_run=true", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDryRunResult(res.data);
      const errCount = res?.data?.summary?.errors ?? 0;
      if (errCount === 0) {
        toast.success("Validation passed. Ready to upload.");
      } else {
        toast.custom(() => (
          <div
            style={{
              background: "var(--theme-card-bg)",
              color: "var(--theme-text)",
              border: "1px solid var(--theme-border)",
              borderRadius: "0.75rem",
              padding: "0.5rem 0.75rem",
              boxShadow: "0 6px 16px var(--theme-components-card-shadow, rgba(0,0,0,.08))",
            }}
          >
            Found <b>{errCount}</b> error{errCount > 1 ? "s" : ""}. Fix or proceed if acceptable.
          </div>
        ));
      }
    } catch (err) {
      const res = err?.response?.data;
      const apiMsg =
        (typeof res === "string" ? res : res?.detail || res?.message) || err?.message;
      ErrorHandling({ defaultError: apiMsg || "Validation failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return ErrorHandling({ defaultError: "Please choose a CSV or XLSX file." });
    if (!roleId) return ErrorHandling({ defaultError: "Please select a Role." });
    if (!branchId) return ErrorHandling({ defaultError: "Please select a Branch." });

    setUploading(true);
    setFinalResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      appendCommon(fd);
      const res = await axiosInstance.post("/users/bulk", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFinalResult(res.data);
      const created = res?.data?.summary?.created ?? 0;
      const errors = res?.data?.summary?.errors ?? 0;
      toast.success(`Created ${created} user(s). ${errors ? `${errors} error(s).` : ""}`);
      onSuccess?.();
    } catch (err) {
      const res = err?.response?.data;
      const apiMsg =
        (typeof res === "string" ? res : res?.detail || res?.message) || err?.message;
      ErrorHandling({ defaultError: apiMsg || "Bulk upload failed." });
    } finally {
      setUploading(false);
    }
  };

  // Download CSV template (required + optional columns)
  const downloadTemplate = () => {
    const header =
      [
        "name",
        "email",
        "phone_number",
        "date_of_joining", // REQUIRED
        "date_of_birth", // REQUIRED
        // ---- optional below ----
        "password",
        "father_name",
        "experience",
        "pan",
        "aadhaar",
        "address",
        "city",
        "state",
        "pincode",
        "comment",
        "vbc_extension_id",
        "vbc_user_username",
        "vbc_user_password",
        "target",
      ].join(",") + "\n";

    const sample = [
      [
        "Aditi Sharma",
        "aditi@example.com",
        "9876543210",
        "2024-08-01",
        "1996-01-20",
        "", // password (optional)
        "Mr Sharma",
        "2",
        "ABCDE1234F",
        "123412341234",
        "MG Road",
        "Indore",
        "MP",
        "452001",
        "",
        "",
        "",
        "",
        "50000",
      ].join(","),
      [
        "Rakesh Kumar",
        "rakesh@example.com",
        "9876543211",
        "2024-09-01",
        "1997-02-10",
        "", "", "", "", "", "", "", "", "", "", "", "", "",
      ].join(","),
    ].join("\n");

    const blob = new Blob([header + sample + "\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_bulk_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const Summary = ({ data }) => {
    if (!data) return null;
    const rows = data?.summary?.rows ?? 0;
    const created = data?.summary?.created ?? data?.summary?.will_create ?? 0;
    const errors = data?.summary?.errors ?? 0;
    const dry = data?.dry_run ? " (Validation)" : "";
    return (
      <div className="theme-panel p-4">
        <div className="flex items-center gap-2 mb-2">
          {errors ? (
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--theme-warning)" }} />
          ) : (
            <CheckCircle2 className="w-5 h-5" style={{ color: "var(--theme-success)" }} />
          )}
          <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
            Summary{dry}
          </h4>
        </div>
        <div
          className="grid grid-cols-3 gap-3 text-sm"
          style={{ color: "var(--theme-text)" }}
        >
          <div>
            <b>Total Rows:</b> {rows}
          </div>
          <div>
            <b>{data.dry_run ? "Will Create" : "Created"}:</b> {created}
          </div>
          <div>
            <b>Errors:</b> {errors}
          </div>
        </div>
      </div>
    );
  };

  const ErrorsList = ({ data }) => {
    const items = (data?.errors || []).filter(Boolean);
    if (!items.length) return null;
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--theme-components-tag-warning-bg, var(--theme-warning, #f59e0b) / 10)",
          border: "1px solid var(--theme-components-tag-warning-border, rgba(0,0,0,0.08))",
          color: "var(--theme-warning, #f59e0b)",
        }}
      >
        <h4 className="font-semibold mb-2" style={{ color: "inherit" }}>
          Errors
        </h4>
        <div className="max-h-48 overflow-auto">
          <ul className="text-sm space-y-1" style={{ color: "inherit" }}>
            {items.map((e, i) => (
              <li key={i}>
                <b>Row {e.row}:</b> {e.error || "Unknown error"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const CreatedList = ({ data }) => {
    const items = (data?.created || []).filter(Boolean);
    if (!items.length) return null;
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "var(--theme-components-tag-success-bg, rgba(16,185,129,0.10))",
          border: "1px solid var(--theme-components-tag-success-border, rgba(16,185,129,0.35))",
          color: "var(--theme-success)",
        }}
      >
        <h4 className="font-semibold mb-2">Created Users</h4>
        <div className="max-h-56 overflow-auto">
          <table className="min-w-full text-sm" style={{ color: "var(--theme-text)" }}>
            <thead style={{ color: "var(--theme-success)" }}>
              <tr className="[&>th]:text-left [&>th]:py-1">
                <th>Emp Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Dept</th>
                <th>Password (masked)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u, i) => (
                <tr
                  key={i}
                  className="[&>td]:py-1"
                  style={{ borderTop: "1px solid var(--theme-border)" }}
                >
                  <td>{u.employee_code}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone_number}</td>
                  <td>{u.role_id}</td>
                  <td>{u.department_id ?? "-"}</td>
                  <td>{u.password_masked || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Theming helpers */}
      <style jsx global>{`
        .theme-panel {
          background: var(--theme-card-bg, var(--theme-card));
          border: 1px solid var(--theme-border);
          border-radius: 1rem;
          box-shadow: 0 10px 28px var(--theme-components-card-shadow, rgba(0, 0, 0, 0.12));
        }
        .theme-btn {
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid transparent;
          transition: transform 0.15s ease, filter 0.15s ease, background 0.15s ease, border 0.15s ease;
        }
        .theme-btn:active {
          transform: translateY(1px);
        }
        .theme-btn-primary {
          background: var(--theme-components-button-primary-bg, var(--theme-primary));
          color: var(--theme-components-button-primary-text, var(--theme-primary-contrast));
          border-color: var(--theme-components-button-primary-border, transparent);
          box-shadow: 0 8px 18px var(--theme-components-button-primary-shadow, rgba(0, 0, 0, 0.12));
        }
        .theme-btn-primary:hover {
          background: var(--theme-components-button-primary-hover-bg, var(--theme-primary-hover));
          filter: brightness(0.98);
        }
        .theme-btn-success {
          background: var(--theme-success);
          color: var(--theme-primary-contrast);
          box-shadow: 0 8px 18px rgba(34, 197, 94, 0.25);
        }
        .theme-btn-success:hover {
          filter: brightness(0.98);
        }
        .theme-btn-secondary {
          background: var(--theme-components-button-secondary-bg, var(--theme-surface));
          color: var(--theme-components-button-secondary-text, var(--theme-text));
          border-color: var(--theme-components-button-secondary-border, var(--theme-border));
        }
        .theme-btn-secondary:hover {
          background: var(--theme-components-button-secondary-hover-bg, var(--theme-primary-softer));
        }
        .theme-input {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--theme-input-border, var(--theme-border));
          background: var(--theme-input-background, var(--theme-card-bg));
          color: var(--theme-text);
          outline: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .theme-input:focus {
          box-shadow: 0 0 0 3px var(--theme-primary-soft);
          border-color: var(--theme-input-focus, var(--theme-primary));
        }
        .theme-muted {
          color: var(--theme-text-muted);
        }
        .theme-soft {
          background: var(--theme-primary-softer);
          border: 1px solid var(--theme-border);
          color: var(--theme-text);
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={closeAll}
        style={{ background: "var(--theme-components-modal-overlay, var(--theme-backdrop, rgba(0,0,0,.45)))" }}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl theme-panel overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--theme-border)" }}
          >
            <h3 className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>
              Bulk Upload Users
            </h3>
            <button
              onClick={closeAll}
              className="p-2 rounded-lg theme-soft"
              aria-label="Close"
              style={{ background: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X className="w-5 h-5" style={{ color: "var(--theme-text-muted)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6" style={{ color: "var(--theme-text)" }}>
            {/* Role & Branch selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--theme-text)" }}>
                  Select Role (apply to all rows)
                </label>
                <select
                  className="theme-input"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="">-- Select Role --</option>
                  {(roles || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--theme-text)" }}>
                  Select Branch (apply to all rows)
                </label>
                <select
                  className="theme-input"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                >
                  <option value="">-- Select Branch --</option>
                  {(branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Uploader */}
            <div
              className="rounded-xl p-6"
              style={{
                border: "2px dashed var(--theme-border)",
                background: "var(--theme-surface)",
              }}
            >
              <div className="flex items-center gap-3">
                <FileUp className="w-6 h-6" style={{ color: "var(--theme-text-muted)" }} />
                <div>
                  <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                    Upload CSV or XLSX exported from your sheet
                  </div>
                  <div className="text-xs theme-muted">
                    <b>Required columns:</b> <b>name</b>, <b>email</b>, <b>phone_number</b>,{" "}
                    <b>date_of_joining</b> (ISO <code>YYYY-MM-DD</code>). Role &amp; Branch are applied from
                    the selectors above.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="theme-input sm:w-auto w-full"
                />
                <button
                  onClick={downloadTemplate}
                  type="button"
                  className="theme-btn theme-btn-secondary text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download CSV template
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={disabled}
                onClick={handleValidate}
                className="theme-btn theme-btn-primary text-sm"
                style={{
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Validating..." : "Validate (Dry Run)"}
              </button>

              <button
                disabled={disabled}
                onClick={handleUpload}
                className="theme-btn theme-btn-success text-sm"
                style={{
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? "Uploading..." : "Upload & Create"}
              </button>

              <button onClick={closeAll} className="theme-btn theme-btn-secondary text-sm" type="button">
                Close
              </button>
            </div>

            {/* Results */}
            <Summary data={dryRunResult} />
            <ErrorsList data={dryRunResult} />

            <Summary data={finalResult} />
            <CreatedList data={finalResult} />
            <ErrorsList data={finalResult} />
          </div>
        </div>
      </div>
    </div>
  );
}
