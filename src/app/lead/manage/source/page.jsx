"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Database,
  Search,
  CheckCircle,
  Building,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

/* --------------------------- helpers --------------------------- */
const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "", branch_id: null, branch_name: "" };
    const p = JSON.parse(raw);

    const rawRole =
      p?.role ??
      p?.role_name ??
      p?.user?.role ??
      p?.user?.role_name ??
      p?.user?.profile?.role ??
      p?.user?.profile?.role_name ??
      "";
    const role = String(rawRole).trim().toUpperCase();

    const branch_id =
      p?.branch_id ??
      p?.user?.branch_id ??
      p?.branch?.id ??
      p?.user?.branch?.id ??
      null;

    const branch_name =
      p?.branch_name ||
      p?.branch?.name ||
      p?.user?.branch_name ||
      p?.user?.branch?.name ||
      (branch_id ? `Branch-${branch_id}` : "");

    return { role, branch_id, branch_name };
  } catch {
    return { role: "", branch_id: null, branch_name: "" };
  }
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// NEW: helpers for breakdown
const getPendingFromBreakdown = (breakdown = []) =>
  breakdown.find((x) => x?.response_id == null) || { total_leads: 0, percentage: 0 };

const getNonPendingBreakdown = (breakdown = []) =>
  (breakdown || []).filter((x) => x?.response_id != null);

export default function LeadSourcesPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const { role, branch_id: userBranchId, branch_name: userBranchName } =
    getUserMeta();
  const isSuperAdmin = role === "SUPERADMIN";

  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [sources, setSources] = useState([]);
  const [roles, setRoles] = useState([]); // from /profile-role/

  const [isCreateNew, setIsCreateNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    branch_id: isSuperAdmin ? "" : userBranchId || "",
    fetch_configs: [], // [{ role_id, per_request_limit, daily_call_limit }]
  });

  const isCreate = isCreateNew && !editingId;

  const showBranchColumn = isSuperAdmin;

  /* --------------------------- load data --------------------------- */
  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      setBranchMap(
        Object.fromEntries(
          list.map((b) => [Number(b.id), b.name || `Branch-${b.id}`])
        )
      );
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load branches",
      });
    }
  };

  const fetchSources = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/lead-config/sources/?skip=0&limit=100"
      );
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load sources",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/profile-role/?skip=0&limit=50&order_by=hierarchy_level"
      );
      const list = Array.isArray(data) ? data.filter((r) => r?.is_active) : [];
      setRoles(list);
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Failed to load profiles",
      });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchBranches(), fetchSources(), fetchRoles()]);

      if (!isSuperAdmin && userBranchId && userBranchName) {
        setBranchMap((prev) => ({
          ...prev,
          [Number(userBranchId)]: userBranchName,
        }));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- role visibility + defaults --------------------------- */
  const visibleRoles = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter(
      (r) =>
        String(r?.name ?? r?.role ?? "").trim().toUpperCase() !== "SUPERADMIN"
    );
  }, [roles, isSuperAdmin]);

  const makeDefaultConfigs = () => {
    const picks = [];
    for (const r of visibleRoles) {
      if (picks.length >= 4) break;
      picks.push({
        role_id: r.id,
        per_request_limit: 50,
        daily_call_limit: 2,
      });
    }
    return picks;
  };

  /* --------------------------- utils --------------------------- */
  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      branch_id: isSuperAdmin ? "" : userBranchId || "",
      fetch_configs: [],
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  const roleAlreadyUsed = (role_id) =>
    form.fetch_configs.some((fc) => Number(fc.role_id) === Number(role_id));

  const addFetchConfig = () => {
    const firstFree = visibleRoles.find((r) => !roleAlreadyUsed(r.id));
    if (!firstFree) return;
    setForm((f) => ({
      ...f,
      fetch_configs: [
        {
          role_id: firstFree.id,
          per_request_limit: 50,
          daily_call_limit: 2,
        },
        ...f.fetch_configs,
      ],
    }));
    toast.success("Added new fetch configuration");
  };

  const updateFetchConfig = (idx, patch) => {
    setForm((f) => {
      const next = [...f.fetch_configs];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, fetch_configs: next };
    });
  };

  const removeFetchConfig = (idx) => {
    setForm((f) => {
      const next = [...f.fetch_configs];
      next.splice(idx, 1);
      return { ...f, fetch_configs: next };
    });
  };

  const canAddConfig = visibleRoles.some((r) => !roleAlreadyUsed(r.id));

  /* --------------------------- submit --------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSuperAdmin && !form.branch_id) {
      ErrorHandling({ defaultError: "Please select a branch" });
      return;
    }
    if (!isSuperAdmin && !form.branch_id) {
      ErrorHandling({ defaultError: "No branch assigned to your account" });
      return;
    }

    const cleanedFetchConfigs = (form.fetch_configs || [])
      .filter((fc) => fc && fc.role_id)
      .map((fc) => ({
        role_id: Number(fc.role_id),
        per_request_limit: Math.max(1, toInt(fc.per_request_limit)),
        daily_call_limit: Math.max(1, toInt(fc.daily_call_limit)),
      }));

    const seen = new Set();
    for (const fc of cleanedFetchConfigs) {
      const key = String(fc.role_id);
      if (seen.has(key)) {
        ErrorHandling({
          defaultError: "Duplicate roles in fetch configs. Please remove duplicates.",
        });
        return;
      }
      seen.add(key);
    }

    setIsSubmitting(true);
    try {
      const branchIdToSend = isSuperAdmin ? Number(form.branch_id) : Number(userBranchId);
      const payload = {
        name: form.name,
        description: form.description,
        branch_id: Number(branchIdToSend),
        fetch_configs: cleanedFetchConfigs,
      };

      if (editingId) {
        await axiosInstance.put(`/lead-config/sources/${editingId}`, payload);
        toast.success("Source updated successfully!");
      } else {
        await axiosInstance.post(`/lead-config/sources/`, payload);
        toast.success("Source created successfully!");
      }

      resetForm();
      await fetchSources();
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Save failed! Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------- edit / delete --------------------------- */
  const handleEdit = (src) => {
    setEditingId(src.id);
    setIsCreateNew(true);

    const fromApi = Array.isArray(src.fetch_configs) ? src.fetch_configs : [];
    setForm({
      name: src.name || "",
      description: src.description || "",
      branch_id: isSuperAdmin ? (src.branch_id ?? "") : (userBranchId || ""),
      fetch_configs: fromApi.map((fc) => ({
        role_id: fc.role_id ?? "",
        per_request_limit: fc.per_request_limit ?? 50,
        daily_call_limit: fc.daily_call_limit ?? 2,
      })),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this source?")) return;
    try {
      await axiosInstance.delete(`/lead-config/sources/${id}?force=false`);
      toast.success("Source deleted successfully!");
      await fetchSources();
    } catch (err) {
      ErrorHandling({
        error: err,
        defaultError: "Delete failed! Please try again.",
      });
    }
  };

  /* --------------------------- filters --------------------------- */
  const filteredSources = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return (sources || []).filter((src) => {
      const roleNames =
        (src.fetch_configs || [])
          .map((fc) => {
            const r = roles.find((x) => x.id === fc.role_id);
            return r?.name || "";
          })
          .join(", ") || "";
      return (
        (src?.name || "").toLowerCase().includes(term) ||
        (src?.description || "").toLowerCase().includes(term) ||
        String(src?.branch_id || "").toLowerCase().includes(term) ||
        roleNames.toLowerCase().includes(term)
      );
    });
  }, [sources, searchTerm, roles]);

  /* --------------------------- UI helpers --------------------------- */
  const renderBranchField = (isCreateMode) => {
    if (!isSuperAdmin) return null;

    if (isCreateMode) {
      return (
        <div>
          <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">
            Branch <span className="text-[var(--theme-danger)]">*</span>
          </label>
          <select
            value={String(form.branch_id ?? "")}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            required
            className="w-full px-4 py-2.5 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all text-[var(--theme-text)]"
          >
            <option value="" disabled>
              {branches.length ? "Select branch…" : "Loading branches…"}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name || `Branch-${b.id}`}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">Branch</label>
        <input
          type="text"
          value={
            branchMap[Number(form.branch_id)] ||
            (form.branch_id ? `Branch-${form.branch_id}` : "")
          }
          readOnly
          className="w-full px-4 py-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg text-[var(--theme-text-muted)]"
        />
      </div>
    );
  };

  const renderFetchConfigs = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--theme-primary)]" />
              Fetch Configurations
            </h3>
            <p className="text-xs text-[var(--theme-text-muted)] mt-1">Set role-specific fetch limits</p>
          </div>
          <button
            type="button"
            onClick={addFetchConfig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] rounded-lg hover:opacity-90 transition-all shadow-sm"
            disabled={!canAddConfig}
          >
            <Plus className="w-4 h-4" />
            Add Config
          </button>
        </div>

        {form.fetch_configs?.length === 0 && (
          <div className="border-2 border-dashed border-[var(--theme-border)] rounded-lg p-6 text-center bg-[var(--theme-surface)]">
            <Users className="w-8 h-8 text-[var(--theme-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--theme-text-muted)]">No fetch configurations added</p>
            <p className="text-xs text-[var(--theme-text-muted)] mt-1">Click "Add Config" to set role-specific limits</p>
          </div>
        )}

        <div className="space-y-3">
          {form.fetch_configs?.map((fc, idx) => {
            const usedIds = new Set(
              form.fetch_configs.map((x, i) => (i === idx ? null : Number(x.role_id)))
            );
            const currentId = Number(fc.role_id ?? 0);
            const currentRole = roles.find((r) => Number(r.id) === currentId);
            const currentInVisible = visibleRoles.some((r) => Number(r.id) === currentId);

            return (
              <div
                key={idx}
                className="bg-[var(--theme-card-bg)] border border-[var(--theme-border)] rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-text)] mb-1.5">
                      Profile Role
                    </label>
                    <select
                      value={String(fc.role_id ?? "")}
                      onChange={(e) =>
                        updateFetchConfig(idx, { role_id: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-[var(--theme-text)]"
                    >
                      <option value="" disabled>
                        Select profile…
                      </option>

                      {!currentInVisible && currentRole && (
                        <option value={String(currentRole.id)} disabled>
                          {currentRole.name} (hidden)
                        </option>
                      )}

                      {visibleRoles.map((r) => (
                        <option
                          key={r.id}
                          value={String(r.id)}
                          disabled={usedIds.has(Number(r.id))}
                        >
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-text)] mb-1.5">
                      Per-Request Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fc.per_request_limit ?? ""}
                      onChange={(e) =>
                        updateFetchConfig(idx, {
                          per_request_limit: toInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-[var(--theme-text)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--theme-text)] mb-1.5">
                      Daily Call Limit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fc.daily_call_limit ?? ""}
                      onChange={(e) =>
                        updateFetchConfig(idx, {
                          daily_call_limit: toInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-[var(--theme-text)]"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeFetchConfig(idx)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--theme-danger-soft)] text-[var(--theme-danger)] rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                      title="Remove config"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-[var(--theme-background)]">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        {!isCreateNew && hasPermission("create_lead") && (
          <button
            onClick={async () => {
              setEditingId(null);
              if (isSuperAdmin && branches.length === 0) {
                try {
                  await fetchBranches();
                } catch { }
              }
              setForm({
                name: "",
                description: "",
                branch_id: isSuperAdmin ? "" : userBranchId || "",
                fetch_configs: makeDefaultConfigs(),
              });
              setIsCreateNew(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-success)] text-[var(--theme-background)] rounded-lg hover:opacity-90 transition"
          >
            <Plus className="w-5 h-5" />
            Create New Source
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-primary-softer)]">
              <Database className="w-5 h-5 text-[var(--theme-primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-primary)]">Total Sources</p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{sources.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-success-soft)]">
              <CheckCircle className="w-5 h-5 text-[var(--theme-success)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-success)]">Active</p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{sources.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-primary-softer)]">
              <Search className="w-5 h-5 text-[var(--theme-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-accent)]">Filtered</p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">
                {filteredSources.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isCreateNew && (
        <div className="fixed inset-0 bg-[var(--theme-backdrop)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--theme-card-bg)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[var(--theme-border)]">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[var(--theme-card-bg)] border-b border-[var(--theme-border)] px-8 py-5 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--theme-text)]">
                    {editingId ? "Edit Lead Source" : "Create New Lead Source"}
                  </h2>
                  <p className="text-sm text-[var(--theme-text-muted)] mt-1">
                    {editingId ? "Update source configuration" : "Set up a new lead source"}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-[var(--theme-primary-softer)] rounded-lg transition-colors text-[var(--theme-text)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Basic Information */}
              <div className="rounded-xl p-6 border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                <div className={`grid grid-cols-1 ${isSuperAdmin ? "md:grid-cols-2" : ""} gap-5`}>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">
                      Source Name <span className="text-[var(--theme-danger)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="Enter source name"
                      className="w-full px-4 py-2.5 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                    />
                  </div>

                  {renderBranchField(isCreate)}
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">
                    Description <span className="text-[var(--theme-danger)]">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    required
                    placeholder="Describe this lead source"
                    className="w-full px-4 py-2.5 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all resize-none text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                  />
                </div>
              </div>

              {/* Fetch Configurations */}
              <div className="rounded-xl p-6 border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                {renderFetchConfigs()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--theme-border)]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)] rounded-lg hover:bg-[var(--theme-primary-softer)] transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[var(--theme-success)] text-[var(--theme-background)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-medium shadow-lg"
                >
                  {isSubmitting
                    ? editingId
                      ? "Updating..."
                      : "Creating..."
                    : editingId
                      ? "Update Source"
                      : "Create Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sources…"
            className="pl-10 pr-4 py-2 border border-[var(--theme-border)] rounded-md w-64 bg-[var(--theme-input-background)] text-[var(--theme-text)] placeholder-[var(--theme-text-muted)] focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]"
          />
        </div>
      </div>

      {/* Sources Accordion (replaces old table) */}
      <div className="bg-[var(--theme-card-bg)] rounded-2xl shadow border border-[var(--theme-border)] divide-y divide-[var(--theme-border)]">
        {filteredSources.map((src) => {
          const fc = Array.isArray(src.fetch_configs) ? src.fetch_configs : [];
          const fcPreview =
            fc
              .map((x) => {
                const rr = roles.find((r) => r.id === x.role_id);
                return rr
                  ? `${rr.name} (${x.per_request_limit}/${x.daily_call_limit})`
                  : `#${x.role_id} (${x.per_request_limit}/${x.daily_call_limit})`;
              })
              .join(", ") || "—";

          const breakdown = Array.isArray(src.response_breakdown) ? src.response_breakdown : [];
          const pending = getPendingFromBreakdown(breakdown);
          const nonPending = getNonPendingBreakdown(breakdown);

          const branchLabel =
            branchMap[Number(src.branch_id)] ||
            src.branch_name ||
            src?.branch?.name ||
            (src.branch_id != null ? `Branch-${src.branch_id}` : "—");

          return (
            <details key={src.id} className="group">
              {/* Header */}
              <summary className="list-none cursor-pointer px-6 py-4 hover:bg-[var(--theme-primary-softer)] transition flex items-start gap-4">
  {/* LEFT COLUMN: ID ABOVE ICON */}
  <div className="flex flex-col items-center gap-1 shrink-0">
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-[var(--theme-primary-softer)] text-[var(--theme-primary)] leading-none">
      #{src.id}
    </span>
    <div className="rounded-full p-1 bg-[var(--theme-primary-softer)]">
      <Database className="w-4 h-4 text-[var(--theme-primary)]" />
    </div>
  </div>

  {/* RIGHT COLUMN: NAME, TOTAL, PENDING, BRANCH, DESCRIPTION */}
  <div className="min-w-0 flex-1">
    <div className="flex flex-wrap items-center gap-2">
      {/* name */}
      <span className="font-semibold text-[var(--theme-text)]">{src.name}</span>

      {/* total */}
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">
        Total: {src.total_leads ?? 0}
      </span>

      {/* pending */}
      {pending?.total_leads > 0 && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Pending: {pending.total_leads}
        </span>
      )}

      {/* branch */}
      {showBranchColumn && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]">
          {branchMap[Number(src.branch_id)] ||
            src.branch_name ||
            src?.branch?.name ||
            (src.branch_id != null ? `Branch-${src.branch_id}` : "—")}
        </span>
      )}
    </div>

    {/* description (unchanged) */}
    {src.description ? (
      <p
        className="text-sm text-[var(--theme-text-muted)] mt-0.5 line-clamp-1"
        title={src.description}
      >
        {src.description}
      </p>
    ) : null}

    {/* fetch config preview (unchanged) */}
    <div className="text-xs text-[var(--theme-text-muted)] mt-1" title={fcPreview}>
      {fc.length ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">
            {fc.length} role(s)
          </span>
          <span className="hidden xl:inline">{fcPreview}</span>
        </span>
      ) : (
        "No fetch configs"
      )}
    </div>
  </div>

  {/* ACTIONS + CHEVRON */}
  <div className="ml-2 flex items-center gap-1">
    {hasPermission("edit_lead") && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleEdit(src);
        }}
        className="p-2 rounded hover:bg-[var(--theme-primary-softer)]"
        title="Edit source"
      >
        <Edit className="w-4 h-4 text-[var(--theme-primary)]" />
      </button>
    )}
    {hasPermission("delete_lead") && (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDelete(src.id);
        }}
        className="p-2 rounded hover:bg-[var(--theme-danger-soft)]"
        title="Delete source"
      >
        <Trash2 className="w-4 h-4 text-[var(--theme-danger)]" />
      </button>
    )}

    <ChevronRight className="w-4 h-4 text-[var(--theme-text-muted)] group-open:hidden" />
    <ChevronDown className="w-4 h-4 text-[var(--theme-text-muted)] hidden group-open:block" />
  </div>
</summary>

              {/* Panel */}
              <div className="px-6 pb-6 pt-2 bg-[var(--theme-surface)] border-t border-[var(--theme-border)]">

                {/* Response Breakdown — plain text (3 per row), excludes "No Response" */}
               {/* Response Distribution (cards like screenshot) */}
<div className="mb-4">
  <h4 className="text-sm font-semibold text-[var(--theme-text)] mb-3">
    RESPONSE DISTRIBUTION
  </h4>

  {nonPending.length === 0 ? (
    <p className="text-sm text-[var(--theme-text-muted)]">
      No responses yet (excluding pending).
    </p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {([...nonPending].sort((a,b) => (b.total_leads||0) - (a.total_leads||0))).map((b, i) => {
        const pct = Math.max(0, Math.min(100, Number(b.percentage) || 0));
        const count = Number(b.total_leads) || 0;
        return (
          <div
            key={i}
            className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-3"
          >
            {/* Title */}
            <div className="text-xs font-extrabold tracking-wide text-[var(--theme-text)] uppercase">
              {b.response_name || "—"}
            </div>

            {/* Count + % */}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-[var(--theme-text-muted)]">
                {count} {count === 1 ? "lead" : "leads"}
              </span>
              <span className="font-semibold text-[var(--theme-text)]">
                {pct.toFixed(2)}%
              </span>
            </div>

            {/* Progress */}
            <div className="mt-2 h-1.5 rounded bg-[var(--theme-border)] overflow-hidden">
              <div
                className="h-full bg-[var(--theme-primary)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

              </div>
            </details>
          );
        })}

        {!loading && filteredSources.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <Database className="w-12 h-12 text-[var(--theme-text-muted)]" />
              <p className="text-[var(--theme-text-muted)]">
                {searchTerm ? `No sources match "${searchTerm}".` : "No sources available."}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-6 py-6 text-center text-[var(--theme-text-muted)]">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
