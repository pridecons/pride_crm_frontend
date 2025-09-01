"use client";
import React, { useMemo, useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

// ---- Helpers ----
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
  serviceTypeOptions = ["Call", "SMS"],
  defaultServiceType = "call",
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
      ft_from_date: toDMY(fromVal),           
      ft_to_date: toDMY(toVal),               
      segment: selectedSegmentLabel,          // ✅ send label as-is from API
      ft_service_type: (svcVal || "").toLowerCase(),
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
              onChange={(e) =>
                setServiceType ? setServiceType(e.target.value) : setLocalServiceType(e.target.value)
              }
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
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
