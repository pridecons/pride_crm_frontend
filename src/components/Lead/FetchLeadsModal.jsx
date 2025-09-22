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
    if (!selectedId) return toast.error("Pick a source first");
    if (!canFetchSelected) return toast.error("This source cannot be fetched right now.");
    setFetching(true);
    try {
      const { data } = await axiosInstance.post("/lead-fetch-source/fetch", {
        source_id: selectedId,
      });
      toast.success(data?.message || "Fetched leads successfully.");
      onFetched?.(data);
      onClose?.();
    } catch (error) {
      ErrorHandling({ error, defaultError: "Failed to fetch leads" });
    } finally {
      setFetching(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Make the card a column layout; only BODY scrolls */}
      <div className="w-full max-w-4xl max-h-[75vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header (sticky) */}
        <div className="sticky top-0 z-20 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Database size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Fetch Leads</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition-all"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">Select Data Source</p>
              <p className="text-sm text-gray-500 mt-1">
                Choose a source and click fetch to import new leads
              </p>
            </div>
            <button
              onClick={loadSources}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              disabled={loadingList}
            >
              {loadingList ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Refresh
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-left text-sm">
              {/* Optional: sticky table header inside the scrollable body */}
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold"></th>
                  <th className="px-4 py-3 font-semibold">Source Name</th>
                  <th className="px-4 py-3 font-semibold">Calls Made</th>
                  <th className="px-4 py-3 font-semibold">Available Leads</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingList ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="animate-spin mx-auto mb-3 text-gray-400" size={24} />
                      <p className="text-gray-500">Loading sources...</p>
                    </td>
                  </tr>
                ) : sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      <Database className="mx-auto mb-3 text-gray-300" size={32} />
                      <p className="font-medium">No sources available</p>
                    </td>
                  </tr>
                ) : (
                  sources.map((s) => {
                    const ok = s.can_fetch_now && (s.leads_remaining_today ?? 0) > 0;
                    const isSelected = selectedId === s.source_id;
                    return (
                      <tr
                        key={s.source_id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedId(s.source_id)}
                      >
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="radio"
                            name="source_id"
                            checked={isSelected}
                            onChange={() => setSelectedId(s.source_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.source_name}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className="font-semibold text-gray-900">{s.calls_made_today ?? 0}</span>
                          <span className="mx-1 text-gray-400">/</span>
                          <span className="text-gray-500">{s.calls_remaining_today ?? 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                            {s.leads_remaining_today ?? 0}
                            <span className="text-xs text-gray-500 font-normal">leads</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ok ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-700">
                              <CheckCircle2 size={14} /> Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-700">
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

          {selectedSource && (
            <div className="mt-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Selected Source
                  </p>
                  <p className="font-semibold text-gray-900 text-lg">{selectedSource.source_name}</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Per Request</p>
                    <p className="font-bold text-gray-900">{selectedSource.per_request_limit ?? "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Daily Limit</p>
                    <p className="font-bold text-gray-900">{selectedSource.daily_call_limit ?? "—"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Available</p>
                    <p className="font-bold text-green-600">{selectedSource.leads_remaining_today ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer (sticky) */}
        <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={fetching}
          >
            Cancel
          </button>
          <button
            onClick={handleFetch}
            disabled={!canFetchSelected || fetching}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all
            ${fetching 
              ? "bg-blue-400 cursor-wait" 
              : canFetchSelected 
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg" 
                : "bg-gray-300 cursor-not-allowed"}`}
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
