// components/BulkUserUploadModal.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { X, FileUp, CheckCircle2, AlertTriangle, Download } from "lucide-react";

// --- helpers --------------------------------------------------------
const toRoleKey = (v) =>
  String(v || "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^SUPER_ADMINISTRATOR$/, "SUPERADMIN");

function getSessionRoleAndBranch() {
  try {
    const raw = Cookies.get("user_info");
    if (raw) {
      const ui = JSON.parse(raw);
      return {
        roleKey: toRoleKey(
          ui?.role_name || ui?.role || ui?.user?.role_name || ui?.user?.role || ui?.profile_role?.name
        ),
      };
    }
  } catch {}
  try {
    const tok = Cookies.get("access_token");
    if (tok) {
      const p = jwtDecode(tok);
      return {
        roleKey: toRoleKey(p?.role_name || p?.role),
      };
    }
  } catch {}
  return { roleKey: "" };
}

export default function BulkUserUploadModal({
  isOpen,
  onClose,
  onSuccess,
  roles = [],
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);

  const [roleId, setRoleId] = useState("");

  // Session context
  const [{ roleKey }, setSession] = useState({
    roleKey: ""
  });
  const isSuper = roleKey === "SUPERADMIN";

  // 🔒 Hide SUPERADMIN from role list
  const visibleRoles = useMemo(
    () => (roles || []).filter((r) => toRoleKey(r?.name) !== "SUPERADMIN"),
    [roles]
  );

  // If SUPERADMIN was somehow selected earlier, clear it
  useEffect(() => {
    if (!roleId) return;
    const stillVisible = visibleRoles.some((r) => String(r.id) === String(roleId));
    if (!stillVisible) setRoleId("");
  }, [visibleRoles, roleId]);

  useEffect(() => {
    if (!isOpen) return;
    const s = getSessionRoleAndBranch();
    setSession(s);
  }, [isOpen]);


  const disabled = !file || uploading || !roleId

  const resetState = () => {
    setFile(null);
    setUploading(false);
    setDryRunResult(null);
    setFinalResult(null);
    setRoleId("");
  };

  const closeAll = () => {
    resetState();
    onClose?.();
  };

  if (!isOpen) return null;

  const appendCommon = (fd) => {
    fd.append("force_role_id", String(roleId));
  };

  const assertSelections = () => {
    if (!file) return "Please choose a CSV or XLSX file.";
    if (!roleId) return "Please select a Role.";
    return null;
  };

  const handleValidate = async () => {
    const errMsg = assertSelections();
    if (errMsg) return ErrorHandling({ defaultError: errMsg });

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
    const errMsg = assertSelections();
    if (errMsg) return ErrorHandling({ defaultError: errMsg });

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

  // Download CSV template
  const downloadTemplate = () => {
    const header =
      [
        "name",
        "email",
        "phone_number",
        "date_of_joining",
        "date_of_birth",
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
        "",
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
        <div className="grid grid-cols-3 gap-3 text-sm" style={{ color: "var(--theme-text)" }}>
          <div><b>Total Rows:</b> {rows}</div>
          <div><b>{data.dry_run ? "Will Create" : "Created"}:</b> {created}</div>
          <div><b>Errors:</b> {errors}</div>
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
      {/* styles omitted for brevity — unchanged from your version */}
      <style jsx global>{`
        .theme-panel { background: var(--theme-card-bg, var(--theme-card)); border: 1px solid var(--theme-border); border-radius: 1rem; box-shadow: 0 10px 28px var(--theme-components-card-shadow, rgba(0,0,0,.12)); }
        .theme-btn { border-radius: .75rem; padding: .5rem .75rem; font-weight: 600; display: inline-flex; align-items: center; gap: .5rem; border: 1px solid transparent; transition: transform .15s ease, filter .15s ease, background .15s ease, border .15s ease; }
        .theme-btn:active { transform: translateY(1px); }
        .theme-btn-primary { background: var(--theme-primary); color: var(--theme-primary-contrast); }
        .theme-btn-success { background: var(--theme-success); color: var(--theme-primary-contrast); }
        .theme-btn-secondary { background: var(--theme-surface); color: var(--theme-text); border-color: var(--theme-border); }
        .theme-input { width: 100%; border-radius: .5rem; padding: .625rem .75rem; border: 1px solid var(--theme-input-border, var(--theme-border)); background: var(--theme-input-background, var(--theme-card-bg)); color: var(--theme-text); }
      `}</style>

      <div className="absolute inset-0" onClick={closeAll}
           style={{ background: "var(--theme-components-modal-overlay, var(--theme-backdrop, rgba(0,0,0,.45)))" }} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl theme-panel overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--theme-border)" }}>
            <h3 className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>Bulk Upload Users</h3>
            <button onClick={closeAll} className="p-2 rounded-lg theme-soft" aria-label="Close" style={{ background: "transparent" }}>
              <X className="w-5 h-5" style={{ color: "var(--theme-text-muted)" }} />
            </button>
          </div>

          <div className="p-6 space-y-6" style={{ color: "var(--theme-text)" }}>
            <div className={`grid gap-4 ${"grid-cols-1"}`}>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--theme-text)" }}>
                  Select Role (apply to all rows)
                </label>
                <select className="theme-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">-- Select Role --</option>
                  {visibleRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl p-6" style={{ border: "2px dashed var(--theme-border)", background: "var(--theme-surface)" }}>
              <div className="flex items-center gap-3">
                <FileUp className="w-6 h-6" style={{ color: "var(--theme-text-muted)" }} />
                <div>
                  <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                    Upload CSV or XLSX exported from your sheet
                  </div>
                  <div className="text-xs theme-muted">
                    <b>Required columns:</b> <b>name</b>, <b>email</b>, <b>phone_number</b>, <b>date_of_joining</b> (ISO <code>YYYY-MM-DD</code>).
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="theme-input sm:w-auto w-full" />
                <button onClick={downloadTemplate} type="button" className="theme-btn theme-btn-secondary text-sm">
                  <Download className="w-4 h-4" /> Download CSV template
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button disabled={disabled} onClick={handleValidate} className="theme-btn theme-btn-primary text-sm"
                      style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                {uploading ? "Validating..." : "Validate (Dry Run)"}
              </button>

              <button disabled={disabled} onClick={handleUpload} className="theme-btn theme-btn-success text-sm"
                      style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
                {uploading ? "Uploading..." : "Upload & Create"}
              </button>

              <button onClick={closeAll} className="theme-btn theme-btn-secondary text-sm" type="button">
                Close
              </button>
            </div>

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
