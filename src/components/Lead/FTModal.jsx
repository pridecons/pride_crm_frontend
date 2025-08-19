"use client";
import React, { useMemo, useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

// ---- Helpers ----
function toInputYMD(d) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already input format
  // assume DD-MM-YYYY
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

// Map UI label -> API segment value
function mapLabelToApiSegment(label) {
  if (!label) return "";
  const key = label.trim().toLowerCase();
  const explicit = {
    "equity cash": "cash",
    "stock future": "future",
    "index future": "index_future",
    "index option": "index_option",
    "stock option": "stock_option",
    "mcx bullion": "mcx_bullion",
    "mcx base metal": "mcx_base_metal",
    "mcx energy": "mcx_energy",
  };
  if (explicit[key]) return explicit[key];
  // fallback slug
  return key.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export default function FTModal({
  open,
  onClose,
  onSave,                 // (payload) => void
  fromDate,               // can be "YYYY-MM-DD" or "DD-MM-YYYY" (optional)
  toDate,                 // same as above (optional)
  setFromDate,            // optional (if you want to control from parent)
  setToDate,              // optional
  // If you prefer controlling these from parent, you can pass serviceType/setServiceType
  serviceType,            // optional controlled value (string, display value e.g. "Call")
  setServiceType,         // optional controlled setter
  serviceTypeOptions = ["Call", "SMS"],
  defaultServiceType = "call",
  loading = false,
}) {
  if (!open) return null;

  // Internal state if not controlled by parent
  const [localFrom, setLocalFrom] = useState("");
  const [localTo, setLocalTo] = useState("");
  const [segmentLabels, setSegmentLabels] = useState([]); // fetched list of labels
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState("");
  const [selectedSegmentLabel, setSelectedSegmentLabel] = useState(""); // UI value
  const [localServiceType, setLocalServiceType] = useState(defaultServiceType);

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
          // default select first if none selected yet
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

  // Prefill service type if provided by parent
  useEffect(() => {
    if (serviceType) setLocalServiceType(serviceType);
  }, [serviceType]);

  const canSave = useMemo(() => {
    return (
      !!selectedSegmentLabel &&
      (serviceType || localServiceType) &&
      localFrom &&
      localTo &&
      !segmentsLoading
    );
  }, [selectedSegmentLabel, serviceType, localServiceType, localFrom, localTo, segmentsLoading]);

  const handleSave = () => {
    const fromVal = localFrom;
    const toVal = localTo;
    const svcVal = (serviceType ?? localServiceType)?.trim();

    const payload = {
      // parent should add lead_response_id
      ft_from_date: toDMY(fromVal),           // "DD-MM-YYYY"
      ft_to_date: toDMY(toVal),               // "DD-MM-YYYY"
      segment: mapLabelToApiSegment(selectedSegmentLabel), // API-friendly
      ft_service_type: (svcVal || "").toLowerCase(),       // e.g., "call"
    };

    // Keep parent in sync if they want
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
          {/* Segment (from API) */}
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
            <p className="text-xs text-gray-500 mt-1">
              Sent to API as: <code>{mapLabelToApiSegment(selectedSegmentLabel) || "—"}</code>
            </p>
          </div>

          {/* FT Service Type */}
          <div>
            <label className="block text-sm font-medium mb-1">FT Service Type</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={serviceType ?? localServiceType}
              onChange={(e) =>
                setServiceType ? setServiceType(e.target.value) : setLocalServiceType(e.target.value)
              }
              disabled={loading}
            >
              {serviceTypeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
             Will send <code>{((serviceType ?? localServiceType) || "").toLowerCase()}</code>
            </p>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => {
                setLocalFrom(e.target.value);
                setFromDate?.(e.target.value);
              }}
              className="w-full border px-3 py-2 rounded"
              disabled={loading}
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => {
                setLocalTo(e.target.value);
                setToDate?.(e.target.value);
              }}
              className="w-full border px-3 py-2 rounded"
              disabled={loading}
            />
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
            title={!canSave ? "Please fill service type, both dates, and segment" : ""}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
