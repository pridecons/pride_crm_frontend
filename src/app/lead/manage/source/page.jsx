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
import { useTheme } from "@/context/ThemeContext";
import { MiniLoader } from "@/components/LoadingState";

/* --------------------------- helpers --------------------------- */
const btnPrimary =
  "px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] hover:bg-[var(--theme-primary-hover)] transition";
const btnSecondary =
  "px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)] transition";
const btnDangerGhost =
  "p-2 rounded hover:bg-[var(--theme-danger-soft)] text-[var(--theme-danger)]";

const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "" };
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

    return { role };
  } catch {
    return { role: "" };
  }
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// NEW: helpers for breakdown
const getPendingFromBreakdown = (breakdown = []) =>
  breakdown.find((x) => x?.response_id == null) || {
    total_leads: 0,
    percentage: 0,
  };

const getNonPendingBreakdown = (breakdown = []) =>
  (breakdown || []).filter((x) => x?.response_id != null);

// NEW: available leads helper (tries a few likely field names)
const getAvailableFromSource = (src) =>
  Number(src?.available_leads ?? src?.available ?? src?.available_count ?? 0) ||
  0;

export default function LeadSourcesPage() {
  const { theme, toggleTheme } = useTheme();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const { role } = getUserMeta();
  const isSuperAdmin = role === "SUPERADMIN";

  const [sources, setSources] = useState([]);
  const [roles, setRoles] = useState([]); // from /profile-role/

  const [isCreateNew, setIsCreateNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    fetch_configs: [], // [{ role_id, per_request_limit, daily_call_limit }]
  });

  const [openRowId, setOpenRowId] = useState(null);

  // ⬇ replace your role cell state + helpers with this
  const [openRoleCells, setOpenRoleCells] = useState(new Set());

  const toggleRoleCell = (rawId) => {
    const key = Number(rawId); // normalize
    setOpenRoleCells((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isRoleCellOpen = (rawId) => openRoleCells.has(Number(rawId)); // normalize everywhere

  const roleNameById = (rolesArr, id) =>
    rolesArr.find((r) => Number(r.id) === Number(id))?.name || `#${id}`;

  useEffect(() => {
    const onDocDown = (e) => {
      // if the click is inside a “safe” area (arrow/panel), do nothing
      if (e.target.closest("[data-acc-safe]")) return;
      setOpenRowId(null); // close accordion
    };
    document.addEventListener("pointerdown", onDocDown, true); // capture
    return () => document.removeEventListener("pointerdown", onDocDown, true);
  }, []);


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

  /* --------------------------- role visibility + defaults --------------------------- */
  const visibleRoles = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter(
      (r) =>
        String(r?.name ?? r?.role ?? "")
          .trim()
          .toUpperCase() !== "SUPERADMIN"
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
      fetch_configs: [],
    });
    setEditingId(null);
    setIsCreateNew(false);
  };

  useEffect(()=>{
    fetchRoles()
  },[])

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

  useEffect(()=>{
    fetchSources()
  },[])

  const canAddConfig = visibleRoles.some((r) => !roleAlreadyUsed(r.id));

  /* --------------------------- submit --------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

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
          defaultError:
            "Duplicate roles in fetch configs. Please remove duplicates.",
        });
        return;
      }
      seen.add(key);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
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
        roleNames.toLowerCase().includes(term)
      );
    });
  }, [sources, searchTerm, roles]);

  const renderFetchConfigs = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--theme-primary)]" />
              Fetch Configurations
            </h3>
            <p className="text-xs text-[var(--theme-text-muted)] mt-1">
              Set role-specific fetch limits
            </p>
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
            <p className="text-sm text-[var(--theme-text-muted)]">
              No fetch configurations added
            </p>
            <p className="text-xs text-[var(--theme-text-muted)] mt-1">
              Click "Add Config" to set role-specific limits
            </p>
          </div>
        )}

        <div className="space-y-3">
          {form.fetch_configs?.map((fc, idx) => {
            const usedIds = new Set(
              form.fetch_configs.map((x, i) =>
                i === idx ? null : Number(x.role_id)
              )
            );
            const currentId = Number(fc.role_id ?? 0);
            const currentRole = roles.find((r) => Number(r.id) === currentId);
            const currentInVisible = visibleRoles.some(
              (r) => Number(r.id) === currentId
            );

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
                        updateFetchConfig(idx, {
                          role_id: Number(e.target.value),
                        })
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
    <div className="p-6 bg-[var(--theme-background)] text-[var(--theme-text)] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-end mb-6">
        {!isCreateNew && hasPermission("create_lead") && (
          <button
            onClick={async () => {
              setEditingId(null);
              setForm({
                name: "",
                description: "",
                fetch_configs: makeDefaultConfigs(),
              });

              setIsCreateNew(true);
            }}
            className={`flex items-center gap-1 ${btnPrimary}`}
          >
            <Plus className="w-5 h-5" />
            Add
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
              <p className="text-sm font-medium text-[var(--theme-primary)]">
                Total Sources
              </p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">
                {sources.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-success-soft)]">
              <CheckCircle className="w-5 h-5 text-[var(--theme-success)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-success)]">
                Active
              </p>
              <p className="text-2xl font-bold text-[var(--theme-text)]">
                {sources.length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 border border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[var(--theme-primary-softer)]">
              <Search className="w-5 h-5 text-[var(--theme-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--theme-accent)]">
                Filtered
              </p>
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
                    {editingId
                      ? "Update source configuration"
                      : "Set up a new lead source"}
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
                <div className={`gap-5`}>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">
                      Source Name{" "}
                      <span className="text-[var(--theme-danger)]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      placeholder="Enter source name"
                      className="w-full px-4 py-2.5 bg-[var(--theme-input-background)] border border-[var(--theme-border)] rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-all text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-[var(--theme-text)] mb-2">
                    Description{" "}
                    <span className="text-[var(--theme-danger)]">*</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
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
                  className={`${btnSecondary} font-medium`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${btnPrimary} disabled:opacity-50 font-medium shadow-lg flex items-center gap-2`}
                >
                  {isSubmitting && <MiniLoader />}
                  {editingId
                    ? isSubmitting
                      ? "Updating..."
                      : "Update Source"
                    : isSubmitting
                    ? "Creating..."
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

      {/* Sources Table (full width) */}
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-separate border-spacing-0">
            {/* Header */}
            <thead className="bg-[var(--theme-surface)]">
              <tr className="text-[var(--theme-text-muted)]">
                <th className="px-2 py-3 text-center w-8 font-semibold first:rounded-tl-2xl"></th>
                <th className="px-4 py-3 text-left font-semibold first:rounded-tl-2xl">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Pending
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Available
                </th>
                <th className="px-4 py-3 text-left font-semibold">Roles</th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-right font-semibold w-[150px] last:rounded-tr-2xl">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[var(--theme-border)] text-[var(--theme-text)]">
              {filteredSources.map((src) => {
                const fc = Array.isArray(src.fetch_configs)
                  ? src.fetch_configs
                  : [];
                const fcPreview =
                  fc
                    .map((x) => {
                      const rr = roles.find((r) => r.id === x.role_id);
                      const name = rr?.name || `#${x.role_id}`;
                      return `${name} (${x.per_request_limit}/${x.daily_call_limit})`;
                    })
                    .join(", ") || "—";

                const breakdown = Array.isArray(src.response_breakdown)
                  ? src.response_breakdown
                  : [];
                const pending = getPendingFromBreakdown(breakdown);
                const available = getAvailableFromSource(src);
                const nonPending = getNonPendingBreakdown(breakdown);

                const isOpen = openRowId === src.id;
                const COLS = 8;
                // (Source, Total, Pending, Roles, Description, Actions)

                return (
                  <React.Fragment key={src.id}>
                    {/* CLICKABLE DATA ROW */}
                    <tr
                      className={`hover:bg-[var(--theme-primary-softer)]/60 cursor-pointer ${
                        isOpen ? "bg-[var(--theme-primary-softer)]/50" : ""
                      }`}
                      aria-expanded={isOpen}
                    >
                      <td className="px-2 py-3 text-center w-8 align-top">
                        <button
                          type="button"
                          data-acc-safe
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRowId((prev) =>
                              prev === src.id ? null : src.id
                            );
                          }}
                          aria-label={
                            openRowId === src.id
                              ? "Collapse details"
                              : "Expand details"
                          }
                          aria-expanded={openRowId === src.id}
                          aria-controls={`panel-${src.id}`}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--theme-primary-softer)] transition"
                          title={openRowId === src.id ? "Collapse" : "Expand"}
                        >
                          {openRowId === src.id ? (
                            <ChevronDown
                              className="w-5 h-5 text-[var(--theme-text-muted)]"
                              strokeWidth={3}
                            />
                          ) : (
                            <ChevronRight
                              className="w-5 h-5 text-[var(--theme-text-muted)]"
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold">{src.name}</div>
                        <div className="text-xs text-[var(--theme-text-muted)] truncate">
                          {(src.alias || src.code || "").toString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {src.total_leads ?? 0}
                      </td>

                      {/* Pending */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {(pending?.total_leads ?? 0) > 0 ? (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs border"
                            style={{
                              background:
                                "var(--theme-components-tag-warning-bg)",
                              color: "var(--theme-components-tag-warning-text)",
                              borderColor:
                                "var(--theme-components-tag-warning-border)",
                            }}
                            title="Pending leads"
                          >
                            {pending.total_leads}
                          </span>
                        ) : (
                          <span className="text-[var(--theme-text-muted)]">
                            0
                          </span>
                        )}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs border"
                          style={{
                            background:
                              "var(--theme-components-tag-info-bg, color-mix(in srgb, var(--theme-primary) 10%, transparent))",
                            color:
                              "var(--theme-components-tag-info-text, var(--theme-primary))",
                            borderColor:
                              "var(--theme-components-tag-info-border, var(--theme-border))",
                          }}
                          title="Available leads"
                        >
                          {available}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div
                          className="relative"
                          data-acc-safe
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {/* Head: only the count is visible */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRoleCell(src.id);
                            }}
                            aria-expanded={isRoleCellOpen(src.id)}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-primary-softer)] transition"
                            title="Show role limits"
                          >
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">
                              {fc.length} role{fc.length !== 1 ? "s" : ""}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-[var(--theme-text-muted)] transition-transform ${
                                isRoleCellOpen(src.id) ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Body: accordion panel */}
                          {isRoleCellOpen(src.id) && (
                            <div
                              id={`roles-panel-${src.id}`}
                              className="absolute z-50 mt-2 w-60 right-0 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] shadow-xl"
                              role="region"
                            >
                              <div className="p-3 border-b border-[var(--theme-border)] text-xs font-semibold text-[var(--theme-text-muted)]">
                                Roles & limits
                              </div>

                              <ul className="max-h-64 overflow-auto p-2">
                                {fc
                                  .slice()
                                  .sort((a, b) =>
                                    roleNameById(
                                      roles,
                                      a.role_id
                                    ).localeCompare(
                                      roleNameById(roles, b.role_id)
                                    )
                                  )
                                  .map((x, i) => (
                                    <li
                                      key={i}
                                      className="flex items-center justify-between gap-2 px-2 py-2 rounded hover:bg-[var(--theme-primary-softer)]/60"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-[var(--theme-text)] truncate">
                                          {roleNameById(roles, x.role_id)}
                                        </div>
                                        <div className="text-xs text-[var(--theme-text-muted)]">
                                          per-request / daily
                                        </div>
                                      </div>
                                      <div className="shrink-0">
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                                          {x.per_request_limit ?? 0}/
                                          {x.daily_call_limit ?? 0}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                              </ul>

                              <div className="p-2 border-t border-[var(--theme-border)] flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleRoleCell(src.id)}
                                  className="text-xs px-2 py-1 rounded hover:bg-[var(--theme-primary-softer)]"
                                  title="Close"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top hidden lg:table-cell">
                        <div
                          className="text-sm text-[var(--theme-text-muted)] line-clamp-2"
                          title={src.description || ""}
                        >
                          {src.description || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={
                            (e) => e.stopPropagation() /* prevent row toggle */
                          }
                        >
                          {hasPermission("edit_lead") && (
                            <button
                              onClick={() => handleEdit(src)}
                              className="p-2 rounded hover:bg-[var(--theme-primary-softer)]"
                              title="Edit source"
                            >
                              <Edit className="w-4 h-4 text-[var(--theme-primary)]" />
                            </button>
                          )}
                          {hasPermission("delete_lead") && (
                            <button
                              onClick={() => handleDelete(src.id)}
                              className={btnDangerGhost}
                              title="Delete source"
                            >
                              <Trash2 className="w-4 h-4 text-[var(--theme-danger)]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED PANEL ROW */}
                    {isOpen && (
                      <tr className="bg-[var(--theme-surface)]">
                        <td className="px-0 py-0" colSpan={COLS}>
                          <div
                            id={`panel-${src.id}`}
                            data-acc-safe
                            onPointerDown={(e) => e.stopPropagation()}
                            className="px-4 sm:px-6 pt-3 pb-5 border-t border-[var(--theme-border)]"
                          >
                            {/* Put the “accordion panel” content here (same as earlier) */}
                            <div className="mb-3">
                              <h4 className="text-sm font-semibold text-[var(--theme-text)]">
                                RESPONSE DISTRIBUTION
                              </h4>
                            </div>

                            {nonPending.length === 0 ? (
                              <p className="text-sm text-[var(--theme-text-muted)]">
                                No responses yet (excluding pending).
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {[...nonPending]
                                  .sort(
                                    (a, b) =>
                                      (b.total_leads || 0) -
                                      (a.total_leads || 0)
                                  )
                                  .map((b, i) => {
                                    const pct = Math.max(
                                      0,
                                      Math.min(100, Number(b.percentage) || 0)
                                    );
                                    const count = Number(b.total_leads) || 0;
                                    return (
                                      <div
                                        key={i}
                                        className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-bg)] p-3"
                                      >
                                        <div className="text-xs font-extrabold tracking-wide text-[var(--theme-text)] uppercase">
                                          {b.response_name || "—"}
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs">
                                          <span className="text-[var(--theme-text-muted)]">
                                            {count}{" "}
                                            {count === 1 ? "lead" : "leads"}
                                          </span>
                                          <span className="font-semibold text-[var(--theme-text)]">
                                            {pct.toFixed(2)}%
                                          </span>
                                        </div>
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
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Empty */}
              { filteredSources.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-[var(--theme-text-muted)]"
                    colSpan={8}
                  >
                    No sources{" "}
                    {searchTerm ? `matching “${searchTerm}”` : "available"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
