// components/BulkUserUploadModal.jsx
"use client";

import { useState } from "react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { X, FileUp, CheckCircle2, AlertTriangle, Download } from "lucide-react";

export default function BulkUserUploadModal({ isOpen, onClose, onSuccess, roles = [], branches = [] }) {
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
    if (!file) return toast.error("Please choose a CSV or XLSX file.");
    if (!roleId) return toast.error("Please select a Role.");
    if (!branchId) return toast.error("Please select a Branch.");

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
          <div className="bg-white px-3 py-2 rounded shadow">
            Found <b>{errCount}</b> error{errCount > 1 ? "s" : ""}. Fix or proceed if acceptable.
          </div>
        ));
      }
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Validation failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please choose a CSV or XLSX file.");
    if (!roleId) return toast.error("Please select a Role.");
    if (!branchId) return toast.error("Please select a Branch.");

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
      ErrorHandling({ error: err, defaultError: "Bulk upload failed." });
    } finally {
      setUploading(false);
    }
  };

  // ✅ Corrected: include ALL mandatory columns in the downloadable template.
  // Mandatory: name,email,phone_number,date_of_joining (ISO YYYY-MM-DD)
  // Role/Branch are forced by UI, so NOT required in the file.
  const downloadTemplate = () => {
   const header = [
  "name",
  "email",
  "phone_number",
  "date_of_joining",   // REQUIRED
  "date_of_birth",     // REQUIRED
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
    "",            // password (optional)
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
    "2024-09-01",  // REQUIRED
    "1997-02-10",  // REQUIRED
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
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          {errors ? (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          )}
          <h4 className="font-semibold text-slate-800">Summary{dry}</h4>
        </div>
        <div className="text-sm text-slate-700 grid grid-cols-3 gap-3">
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h4 className="font-semibold text-amber-800 mb-2">Errors</h4>
        <div className="max-h-48 overflow-auto">
          <ul className="text-sm text-amber-900 space-y-1">
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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h4 className="font-semibold text-emerald-800 mb-2">Created Users</h4>
        <div className="max-h-56 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-emerald-900">
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
            <tbody className="text-emerald-900">
              {items.map((u, i) => (
                <tr key={i} className="[&>td]:py-1 border-t border-emerald-200/40">
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeAll} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-xl font-semibold text-slate-900">Bulk Upload Users</h3>
            <button
              onClick={closeAll}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">

            {/* Role & Branch selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Select Role (apply to all rows)
                </label>
                <select
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Select Branch (apply to all rows)
                </label>
                <select
                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
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
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 bg-slate-50">
              <div className="flex items-center gap-3">
                <FileUp className="w-6 h-6 text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">
                    Upload CSV or XLSX exported from your sheet
                  </div>
                  <div className="text-xs text-slate-600">
                    <b>Required columns:</b> <b>name</b>, <b>email</b>, <b>phone_number</b>, <b>date_of_joining</b> (ISO <code>YYYY-MM-DD</code>).
                    <span className="ml-1">Role &amp; Branch are applied from the selectors above.</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full sm:w-auto file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white file:px-4 file:py-2 file:cursor-pointer text-sm"
                />
                <button
                  onClick={downloadTemplate}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
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
                className={`px-4 py-2 rounded-xl text-white text-sm shadow-sm ${
                  disabled ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {uploading ? "Validating..." : "Validate (Dry Run)"}
              </button>

              <button
                disabled={disabled}
                onClick={handleUpload}
                className={`px-4 py-2 rounded-xl text-white text-sm shadow-sm ${
                  disabled ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {uploading ? "Uploading..." : "Upload & Create"}
              </button>

              <button
                onClick={closeAll}
                className="px-4 py-2 rounded-xl text-slate-700 border text-sm hover:bg-slate-50"
                type="button"
              >
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
