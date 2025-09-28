"use client";
import React, { useMemo, useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

// ---- Helpers ----
function normalizeServiceType(s) {
  const v = String(s || "").trim().toUpperCase();
  return v === "SMS" ? "SMS" : "CALL";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseYMD(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}
function addDays(ymd, n) {
  const t = parseYMD(ymd);
  if (t == null) return "";
  const dt = new Date(t + n * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function inclusiveSpanDays(from, to) {
  const f = parseYMD(from);
  const t = parseYMD(to);
  if (f == null || t == null) return NaN;
  return Math.floor((t - f) / MS_PER_DAY) + 1;
}
function toInputYMD(d) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const [dd, mm, yyyy] = d.split("-");
  if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  return "";
}
function toDMY(d) {
  if (!d) return "";
  const [yyyy, mm, dd] = d.split("-");
  if (yyyy && mm && dd) return `${dd}-${mm}-${yyyy}`;
  return d;
}

export default function FTModal({
  open,
  onClose,
  onSave,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  serviceType,
  setServiceType,
  serviceTypeOptions = ["CALL", "SMS"],
  defaultServiceType = "CALL",
  loading = false,
}) {
  if (!open) return null;

  const [localFrom, setLocalFrom] = useState("");
  const [localTo, setLocalTo] = useState("");
  const [segmentLabels, setSegmentLabels] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");
  const [selectedSegmentLabel, setSelectedSegmentLabel] = useState("");
  const [localServiceType, setLocalServiceType] = useState(defaultServiceType);
  const [dateError, setDateError] = useState("");

  // Today (YYYY-MM-DD)
  const todayYMD = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  // Prefill dates (clamp to today+)
  useEffect(() => {
    const v = toInputYMD(fromDate || "");
    if (!v) return setLocalFrom("");
    setLocalFrom(parseYMD(v) < parseYMD(todayYMD) ? todayYMD : v);
  }, [fromDate, todayYMD]);

  useEffect(() => {
    const v = toInputYMD(toDate || "");
    if (!v) return setLocalTo("");
    setLocalTo(parseYMD(v) < parseYMD(todayYMD) ? todayYMD : v);
  }, [toDate, todayYMD]);

  // Fetch segments when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function fetchSegments() {
      setSegmentsLoading(true);
      setSegmentsError("");
      try {
        const { data } = await axiosInstance.get(
          "/profile-role/recommendation-type"
        );
        if (!cancelled) {
          const labels = Array.isArray(data) ? data : [];
          setSegmentLabels(labels);
          if (!selectedSegmentLabel && labels.length) {
            setSelectedSegmentLabel(labels[0]);
          }
        }
      } catch {
        if (!cancelled) setSegmentsError("Failed to load segments");
      } finally {
        if (!cancelled) setSegmentsLoading(false);
      }
    }
    fetchSegments();
    return () => {
      cancelled = true;
    };
  }, [open, selectedSegmentLabel]);

  // Sync service type from parent (if controlled)
  useEffect(() => {
    if (serviceType) setLocalServiceType(serviceType);
  }, [serviceType]);

  // Validation
  useEffect(() => {
    if (!localFrom || !localTo) {
      setDateError("");
      return;
    }
    if (parseYMD(localTo) < parseYMD(localFrom)) {
      setDateError("To Date cannot be before From Date.");
      return;
    }
    const span = inclusiveSpanDays(localFrom, localTo);
    if (span > 5) {
      setDateError("Select a range of up to 5 days only.");
      return;
    }
    setDateError("");
  }, [localFrom, localTo]);

  const canSave = useMemo(() => {
    const hasBasics =
      !!selectedSegmentLabel &&
      (serviceType || localServiceType) &&
      localFrom &&
      localTo &&
      !segmentsLoading;

    const okSpan =
      localFrom &&
      localTo &&
      parseYMD(localTo) >= parseYMD(localFrom) &&
      inclusiveSpanDays(localFrom, localTo) <= 5;

    return hasBasics && okSpan && !dateError;
  }, [
    selectedSegmentLabel,
    serviceType,
    localServiceType,
    localFrom,
    localTo,
    segmentsLoading,
    dateError,
  ]);

  const handleSave = () => {
    const payload = {
      ft_from_date: toDMY(localFrom),
      ft_to_date: toDMY(localTo),
      segment: selectedSegmentLabel,
      ft_service_type: normalizeServiceType(serviceType ?? localServiceType),
    };
    setFromDate?.(localFrom);
    setToDate?.(localTo);
    setServiceType?.(serviceType ?? localServiceType);
    onSave?.(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "var(--theme-components-modal-overlay, rgba(0,0,0,.30))",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 shadow-lg"
        style={{
          background: "var(--theme-components-modal-bg)",
          color: "var(--theme-components-modal-text)",
          border: "1px solid var(--theme-components-modal-border)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--theme-text)" }}
        >
          Set FT Details
        </h2>

        <div className="space-y-4">
          {/* Segment */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text)" }}
            >
              Segment
            </label>

            {segmentsLoading ? (
              <div
                className="text-sm"
                style={{ color: "var(--theme-textSecondary)" }}
              >
                Loading segments…
              </div>
            ) : segmentsError ? (
              <div
                className="text-sm"
                style={{ color: "var(--theme-error, #ef4444)" }}
              >
                {segmentsError}
              </div>
            ) : (
              <select
                className="w-full rounded outline-none"
                value={selectedSegmentLabel}
                onChange={(e) => setSelectedSegmentLabel(e.target.value)}
                disabled={loading || segmentLabels.length === 0}
                style={{
                  background: "var(--theme-components-input-bg)",
                  color: "var(--theme-components-input-text)",
                  border: "1px solid var(--theme-components-input-border)",
                  padding: "0.5rem 0.75rem",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)";
                  e.currentTarget.style.borderColor =
                    "var(--theme-components-input-focus)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor =
                    "var(--theme-components-input-border)";
                }}
              >
                {segmentLabels.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service Type */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text)" }}
            >
              FT Service Type
            </label>
            <select
              className="w-full rounded outline-none"
              value={serviceType ?? localServiceType}
              onChange={(e) => {
                const v = e.target.value;
                setServiceType ? setServiceType(v) : setLocalServiceType(v);
              }}
              disabled={loading}
              style={{
                background: "var(--theme-components-input-bg)",
                color: "var(--theme-components-input-text)",
                border: "1px solid var(--theme-components-input-border)",
                padding: "0.5rem 0.75rem",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-border)";
              }}
            >
              {serviceTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text)" }}
            >
              From Date
            </label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => {
                let val = e.target.value;

                if (val && parseYMD(val) < parseYMD(todayYMD)) val = todayYMD;

                if (localTo) {
                  const maxFrom = addDays(localTo, -4);
                  if (parseYMD(val) > parseYMD(maxFrom)) val = maxFrom;
                }

                setLocalFrom(val);
                setFromDate?.(val);

                if (localTo && parseYMD(localTo) < parseYMD(val)) {
                  const newTo = val;
                  setLocalTo(newTo);
                  setToDate?.(newTo);
                }
              }}
              className="w-full rounded outline-none"
              disabled={loading}
              min={todayYMD}
              max={localTo ? addDays(localTo, -4) : undefined}
              style={{
                background: "var(--theme-components-input-bg)",
                color: "var(--theme-components-input-text)",
                border: "1px solid var(--theme-components-input-border)",
                padding: "0.5rem 0.75rem",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-border)";
              }}
            />
          </div>

          {/* To Date */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text)" }}
            >
              To Date
            </label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => {
                let val = e.target.value;

                const minTo =
                  localFrom && parseYMD(localFrom) > parseYMD(todayYMD)
                    ? localFrom
                    : todayYMD;

                if (val && parseYMD(val) < parseYMD(minTo)) val = minTo;

                if (localFrom) {
                  const maxTo = addDays(localFrom, 4);
                  if (parseYMD(val) > parseYMD(maxTo)) val = maxTo;
                }

                setLocalTo(val);
                setToDate?.(val);
              }}
              className="w-full rounded outline-none"
              disabled={loading}
              min={localFrom || todayYMD}
              max={localFrom ? addDays(localFrom, 4) : undefined}
              style={{
                background: "var(--theme-components-input-bg)",
                color: "var(--theme-components-input-text)",
                border: "1px solid var(--theme-components-input-border)",
                padding: "0.5rem 0.75rem",
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px color-mix(in oklab, var(--theme-components-input-focus) 30%, transparent)";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-focus)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor =
                  "var(--theme-components-input-border)";
              }}
            />
            <div className="text-xs mt-1">
              <span style={{ color: "var(--theme-textSecondary)" }}>
                Max range: 5 days (inclusive)
              </span>
              {dateError ? (
                <div style={{ color: "var(--theme-error, #ef4444)" }}>{dateError}</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow:
                "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-hoverBg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                "var(--theme-components-button-secondary-bg)")
            }
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading || !canSave}
            className="px-4 py-2 text-sm rounded transition-colors"
            style={{
              background: "var(--theme-components-button-primary-bg)",
              color: "var(--theme-components-button-primary-text)",
              border:
                "1px solid var(--theme-components-button-primary-border, transparent)",
              boxShadow:
                "0 6px 16px -6px var(--theme-components-button-primary-shadow)",
              cursor: loading || !canSave ? "not-allowed" : "pointer",
              opacity: loading || !canSave ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!(loading || !canSave)) {
                e.currentTarget.style.background =
                  "var(--theme-components-button-primary-hoverBg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!(loading || !canSave)) {
                e.currentTarget.style.background =
                  "var(--theme-components-button-primary-bg)";
              }
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
