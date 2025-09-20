"use client";
import React, { useMemo, useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

// ---- Helpers ----

function normalizeServiceType(s) {
  const v = String(s || "").trim().toUpperCase();
  return v === "SMS" ? "SMS" : "CALL"; // only allow known values
}

// --- Add below your toDMY() helper ---
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseYMD(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d); // use UTC to avoid TZ shifts
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

function clampYMD(val, min, max) {
  if (!val) return val;
  if (min && parseYMD(val) < parseYMD(min)) return min;
  if (max && parseYMD(val) > parseYMD(max)) return max;
  return val;
}

function inclusiveSpanDays(from, to) {
  const f = parseYMD(from);
  const t = parseYMD(to);
  if (f == null || t == null) return NaN;
  return Math.floor((t - f) / MS_PER_DAY) + 1; // inclusive
}

function toInputYMD(d) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already input format
  const [dd, mm, yyyy] = d.split("-"); // assume DD-MM-YYYY
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
  // Add this with your other state hooks
  const [dateError, setDateError] = useState("");

  // Prefill dates
  useEffect(() => {
    setLocalFrom(toInputYMD(fromDate || ""));
  }, [fromDate]);

  useEffect(() => {
    setLocalTo(toInputYMD(toDate || ""));
  }, [toDate]);

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
      } catch (e) {
        if (!cancelled) {
          setSegmentsError("Failed to load segments");
        }
      } finally {
        if (!cancelled) setSegmentsLoading(false);
      }
    }

    fetchSegments();
    return () => { cancelled = true; };
  }, [open]);

  // Prefill service type if parent controls it
  useEffect(() => {
    if (serviceType) setLocalServiceType(serviceType);
  }, [serviceType]);

  const canSave = useMemo(() => {
    const hasBasics =
      !!selectedSegmentLabel &&
      (serviceType || localServiceType) &&
      localFrom &&
      localTo &&
      !segmentsLoading;

    // must be within 5 days inclusive and to >= from
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


  const handleSave = () => {
    const fromVal = localFrom;
    const toVal = localTo;
    const svcVal = (serviceType ?? localServiceType)?.trim();

    const payload = {
      ft_from_date: toDMY(fromVal),
      ft_to_date: toDMY(toVal),
      segment: selectedSegmentLabel,          // ✅ send label as-is from API
      ft_service_type: normalizeServiceType(svcVal),
    };

    setFromDate?.(fromVal);
    setToDate?.(toVal);
    setServiceType?.(svcVal);

    onSave?.(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Set FT Details</h2>

        <div className="space-y-4">
          {/* Segment */}
          <div>
            <label className="block text-sm font-medium mb-1">Segment</label>
            {segmentsLoading ? (
              <div className="text-sm text-gray-500">Loading segments…</div>
            ) : segmentsError ? (
              <div className="text-sm text-red-600">{segmentsError}</div>
            ) : (
              <select
                className="w-full border px-3 py-2 rounded"
                value={selectedSegmentLabel}
                onChange={(e) => setSelectedSegmentLabel(e.target.value)}
                disabled={loading || segmentLabels.length === 0}
              >
                {segmentLabels.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium mb-1">FT Service Type</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={serviceType ?? localServiceType}
              onChange={(e) => {
                const v = e.target.value;
                setServiceType ? setServiceType(v) : setLocalServiceType(v);
              }}
              disabled={loading}
            >
              {serviceTypeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => {
                const val = e.target.value;


                setLocalFrom(val);

                setFromDate?.(val);
              }}
              className="w-full border px-3 py-2 rounded"
              disabled={loading}
              // Optional: if you want to limit how far back From can go based on To
              max={localTo ? addDays(localTo, -4) : undefined}
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => {
                const val = e.target.value;
                setLocalTo(val);
                setToDate?.(val);
              }}
              className="w-full border px-3 py-2 rounded"
              disabled={loading}
            />
            <div className="text-xs mt-1">
              <span className="text-gray-500">Max range: 5 days (inclusive)</span>
              {dateError ? (
                <div className="text-red-600 mt-1">{dateError}</div>
              ) : null}
            </div>

          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || !canSave}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
