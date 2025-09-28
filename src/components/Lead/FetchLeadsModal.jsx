"use client";

import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { X, RefreshCw, CheckCircle2, CircleX, Loader2, Database } from "lucide-react";
import { toast } from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function FetchLeadsModal({ open, onClose, onFetched }) {
  const [loadingList, setLoadingList] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sources, setSources] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    loadSources();
  }, [open]);

  const loadSources = async () => {
    setLoadingList(true);
    try {
      const { data } = await axiosInstance.get("/lead-fetch-source/sources");
      const arr = Array.isArray(data) ? data : [];
      setSources(arr);
      if (arr.length === 1) setSelectedId(arr[0].source_id);
      else {
        const pick = arr.find((s) => s.can_fetch_now && (s.leads_remaining_today ?? 0) > 0);
        if (pick) setSelectedId(pick.source_id);
      }
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to load fetch sources" });
    } finally {
      setLoadingList(false);
    }
  };

  const selectedSource = useMemo(
    () => sources.find((s) => s.source_id === selectedId),
    [sources, selectedId]
  );

  const canFetchSelected =
    !!selectedSource &&
    selectedSource.can_fetch_now &&
    (selectedSource.leads_remaining_today ?? 0) > 0;

  const handleFetch = async () => {
    if (!selectedId) return ErrorHandling({ defaultError: "Pick a source first." });
    if (!canFetchSelected) return ErrorHandling({ defaultError: "This source cannot be fetched right now." });
    setFetching(true);
    try {
      const { data } = await axiosInstance.post("/lead-fetch-source/fetch", { source_id: selectedId });
      toast.success(data?.message || "Fetched leads successfully.");
      onFetched?.(data);
      onClose?.();
    } catch (error) {
      const res = error?.response?.data;
      const apiMsg = (typeof res === "string" ? res : (res?.detail || res?.message)) || error?.message;
      ErrorHandling({ defaultError: apiMsg || "Failed to fetch leads." });
    } finally {
      setFetching(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "var(--theme-components-modal-overlay, rgba(0,0,0,.30))",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Card container (column layout; only BODY scrolls) */}
      <div
        className="w-full max-w-3xl max-h-[75vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{
          background: "var(--theme-components-modal-bg)",
          color: "var(--theme-components-modal-text)",
          border: "1px solid var(--theme-components-modal-border)",
        }}
      >
        {/* Header (sticky) */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
          style={{
            background: "var(--theme-components-modal-headerBg, var(--theme-components-modal-bg))",
            color: "var(--theme-components-modal-headerText, var(--theme-components-modal-text))",
            boxShadow: "inset 0 -1px 0 var(--theme-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg p-2"
              style={{
                background: "color-mix(in oklab, var(--theme-primary) 20%, transparent)",
              }}
            >
              <Database size={20} style={{ color: "var(--theme-primary)" }} />
            </div>
            <h3 className="text-lg font-semibold">Fetch Leads</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors"
            title="Close"
            style={{
              color: "color-mix(in oklab, var(--theme-components-modal-text) 80%, transparent)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in oklab, var(--theme-primary) 12%, transparent)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-medium" style={{ color: "var(--theme-text)" }}>
                Select Data Source
              </p>
              <p className="text-sm" style={{ color: "var(--theme-textSecondary)" }}>
                Choose a source and click fetch to import new leads
              </p>
            </div>

            <button
              onClick={loadSources}
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: "var(--theme-components-button-secondary-bg)",
                color: "var(--theme-components-button-secondary-text)",
                border: "1px solid var(--theme-components-button-secondary-border)",
                boxShadow: `0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-components-button-secondary-hoverBg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-components-button-secondary-bg)")}
            >
              {loadingList ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Refresh
            </button>
          </div>

          <div
            className="overflow-hidden rounded-xl shadow-sm"
            style={{ border: "1px solid var(--theme-components-table-border)" }}
          >
            <table className="w-full text-left text-sm">
              <thead
                className="sticky top-0 z-10"
                style={{
                  background: "var(--theme-components-table-headerBg)",
                  color: "var(--theme-components-table-headerText)",
                }}
              >
                <tr>
                  <th className="px-4 py-3 font-semibold"></th>
                  <th className="px-4 py-3 font-semibold">Source Name</th>
                  <th className="px-4 py-3 font-semibold">Calls Made</th>
                  <th className="px-4 py-3 font-semibold">Available Leads</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>

              <tbody
                className="divide-y"
                style={{ borderColor: "var(--theme-components-table-border)" }}
              >
                {loadingList ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin mx-auto mb-3" size={24} style={{ color: "var(--theme-textSecondary)" }} />
                      <p style={{ color: "var(--theme-textSecondary)" }}>Loading sources...</p>
                    </td>
                  </tr>
                ) : sources.filter((s) => (s.fresh_leads_available ?? 0) > 0).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center" style={{ color: "var(--theme-textSecondary)" }}>
                      <Database className="mx-auto mb-3" size={32} style={{ color: "var(--theme-border)" }} />
                      <p className="font-medium">No sources available</p>
                    </td>
                  </tr>
                ) : (
                  sources
                    .filter((s) => (s.fresh_leads_available ?? 0) > 0)
                    .map((s) => {
                      const ok = s.can_fetch_now && (s.leads_remaining_today ?? 0) > 0;
                      const isSelected = selectedId === s.source_id;
                      return (
                        <tr
                          key={s.source_id}
                          className="cursor-pointer transition-colors"
                          style={{
                            background: isSelected
                              ? "color-mix(in oklab, var(--theme-primary) 8%, transparent)"
                              : "transparent",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              isSelected
                                ? "color-mix(in oklab, var(--theme-primary) 10%, transparent)"
                                : "var(--theme-components-table-rowHoverBg)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = isSelected
                              ? "color-mix(in oklab, var(--theme-primary) 8%, transparent)"
                              : "transparent")
                          }
                          onClick={() => setSelectedId(s.source_id)}
                        >
                          <td className="px-4 py-3 align-middle">
                            <input
                              type="radio"
                              name="source_id"
                              checked={isSelected}
                              onChange={() => setSelectedId(s.source_id)}
                              className="h-4 w-4"
                              style={{
                                accentColor: "var(--theme-primary)",
                              }}
                            />
                          </td>

                          <td className="px-4 py-3 font-medium" style={{ color: "var(--theme-text)" }}>
                            {s.source_name}
                          </td>

                          <td className="px-4 py-3" style={{ color: "var(--theme-textSecondary)" }}>
                            <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                              {s.calls_made_today ?? 0}
                            </span>
                            <span className="mx-1" style={{ color: "var(--theme-border)" }}>
                              /
                            </span>
                            <span>{s.calls_remaining_today ?? 0}</span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: "var(--theme-text)" }}>
                              {s.leads_remaining_today ?? 0}
                              <span className="text-xs" style={{ color: "var(--theme-textSecondary)" }}>
                                leads
                              </span>
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {ok ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                                style={{
                                  background: "var(--theme-components-tag-success-bg)",
                                  color: "var(--theme-components-tag-success-text)",
                                  border: "1px solid var(--theme-components-tag-success-border)",
                                }}
                              >
                                <CheckCircle2 size={14} /> Available
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                                style={{
                                  background: "var(--theme-components-tag-error-bg)",
                                  color: "var(--theme-components-tag-error-text)",
                                  border: "1px solid var(--theme-components-tag-error-border)",
                                }}
                              >
                                <CircleX size={14} /> Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {selectedSource && (selectedSource.fresh_leads_available ?? 0) > 0 && (
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                background: "color-mix(in oklab, var(--theme-primary) 6%, var(--theme-surface))",
                border: "1px solid color-mix(in oklab, var(--theme-primary) 35%, var(--theme-border))",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "var(--theme-primary)" }}
                  >
                    Selected Source
                  </p>
                  <p className="font-semibold text-lg" style={{ color: "var(--theme-text)" }}>
                    {selectedSource.source_name}
                  </p>
                </div>

                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "var(--theme-textSecondary)" }}>
                      Per Request
                    </p>
                    <p className="font-bold" style={{ color: "var(--theme-text)" }}>
                      {selectedSource.per_request_limit ?? "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "var(--theme-textSecondary)" }}>
                      Daily Limit
                    </p>
                    <p className="font-bold" style={{ color: "var(--theme-text)" }}>
                      {selectedSource.daily_call_limit ?? "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: "var(--theme-textSecondary)" }}>
                      Available
                    </p>
                    <p className="font-bold" style={{ color: "var(--theme-success, #22c55e)" }}>
                      {selectedSource.leads_remaining_today ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer (sticky) */}
        <div
          className="sticky bottom-0 z-20 flex items-center justify-end gap-3 px-6 py-4"
          style={{
            background: "var(--theme-surface)",
            borderTop: "1px solid var(--theme-border)",
          }}
        >
          <button
            onClick={onClose}
            disabled={fetching}
            className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow: `0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-components-button-secondary-hoverBg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-components-button-secondary-bg)")}
          >
            Cancel
          </button>

          <button
            onClick={handleFetch}
            disabled={!canFetchSelected || fetching}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
            style={{
              background: fetching
                ? "color-mix(in oklab, var(--theme-components-button-primary-bg) 60%, white)"
                : canFetchSelected
                ? "var(--theme-components-button-primary-bg)"
                : "var(--theme-border)",
              color: canFetchSelected ? "var(--theme-components-button-primary-text)" : "var(--theme-textSecondary)",
              border: "1px solid var(--theme-components-button-primary-border, transparent)",
              boxShadow: canFetchSelected
                ? `0 6px 16px -6px var(--theme-components-button-primary-shadow)`
                : "none",
              cursor: !canFetchSelected || fetching ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (canFetchSelected && !fetching)
                e.currentTarget.style.background = "var(--theme-components-button-primary-hoverBg)";
            }}
            onMouseLeave={(e) => {
              if (canFetchSelected && !fetching)
                e.currentTarget.style.background = "var(--theme-components-button-primary-bg)";
            }}
            title="Fetch leads from selected source"
          >
            {fetching ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            Fetch Leads
          </button>
        </div>
      </div>
    </div>
  );
}
