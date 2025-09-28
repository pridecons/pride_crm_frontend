// src/components/Lead/ViewAndEditLead.jsx
"use client";

import {
  User,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  Building,
  MapPin,
  Globe,
  Briefcase,
} from "lucide-react";
import { InputField } from "./InputField";
import { MultiSelectWithCheckboxes } from "./MultiSelectWithCheckboxes";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { MiniLoader } from "@/components/LoadingState";
import { ErrorHandling } from "@/helper/ErrorHandling";

// Single-flight + cache for recommendation types
let _recTypeCache = null;
let _recTypePromise = null;

async function loadRecommendationTypes(axiosInstance) {
  if (_recTypeCache) return _recTypeCache;
  if (_recTypePromise) return _recTypePromise;

  _recTypePromise = axiosInstance
    .get("/profile-role/recommendation-type")
    .then((res) => {
      const items = Array.isArray(res?.data) ? res.data : [];
      _recTypeCache = items;           // cache for future callers
      return _recTypeCache;
    })
    .finally(() => {
      _recTypePromise = null;          // allow refresh if you ever clear cache
    });

  return _recTypePromise;
}

// ---- DOB helpers (supports DD-MM-YYYY, YYYY-MM-DD, ISO, slashes) ----
function toYMD(input) {
  if (!input) return "";
  if (input instanceof Date && !isNaN(input)) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  let s = String(input).trim();

  // Strip time if ISO
  if (s.includes("T")) s = s.split("T")[0];

  // Already Y-M-D
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // D-M-Y with dashes
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  // D/M/Y or Y/M/D
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    return s.replace(/\//g, "-");
  }

  // Fallback: let Date try, but convert back to Y-M-D
  const d = new Date(s);
  if (!isNaN(d)) return toYMD(d);
  return "";
}

// REPLACE your existing calculateAge with this:
function calculateAge(dobLike) {
  const ymd = toYMD(dobLike);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const thisMonth = today.getMonth() + 1;
  const thisDay = today.getDate();
  if (thisMonth < m || (thisMonth === m && thisDay < d)) age--;
  return String(age);
}

// Utility: format ISO datetime to DD-MM-YYYY
function formatDDMMYYYY(dt) {
  const d = new Date(dt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function StateAutocomplete({
  value,
  disabled,
  onPick,         // (obj | null) -> void   obj = { state_name, code }
  placeholder = "Select state",
  busy = false,
  list = [],
  error = null,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [hoverIdx, setHoverIdx] = useState(-1);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = (arr, q) => {
    if (!q) return arr.slice(0, 10);
    const s = q.toLowerCase();
    return arr.filter(i => i.state_name.toLowerCase().includes(s)).slice(0, 12);
  };

  const onSelect = (item) => {
    onPick?.(item || null);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx(i => Math.min(i + 1, filtered(list, query).length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const arr = filtered(list, query);
      const pick = arr[hoverIdx] || arr[0];
      if (pick) onSelect(pick);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const listNow = filtered(list, query);

  return (
    <div className="relative">
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--theme-text,#0f172a)" }}
      >
        State
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            onPick?.(
              e.target.value
                ? { state_name: e.target.value, code: null }
                : null
            );
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full py-2 px-3 rounded-lg mt-1"
          style={{
            background: "var(--theme-card-bg,#fff)",
            color: "var(--theme-text,#0f172a)",
            border: "1px solid var(--theme-border,#e5e7eb)",
            outline: "none",
          }}
        />
        {busy && <MiniLoader />}
      </div>

      {open && !disabled && (
        <div
          className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg shadow"
          onMouseLeave={() => setHoverIdx(-1)}
          style={{
            background: "var(--theme-card-bg,#fff)",
            border: "1px solid var(--theme-border,#e5e7eb)",
          }}
        >
          {error ? (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--theme-danger,#dc2626)" }}>
              {error}
            </div>
          ) : listNow.length ? (
            listNow.map((item, idx) => (
              <button
                key={`${item.state_name}-${item.code ?? "x"}`}
                type="button"
                onClick={() => onSelect(item)}
                onMouseEnter={() => setHoverIdx(idx)}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  background:
                    idx === hoverIdx
                      ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 10%, var(--theme-card-bg,#fff))"
                      : "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text,#0f172a)",
                }}
              >
                {item.state_name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm" style={{ color: "var(--theme-text-muted,#64748b)" }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ViewAndEditLead = ({
  currentLead,
  editFormData,
  setEditFormData,
  isEditMode,
  leadSources,
  leadResponses,
  handleLeadResponseChange,
  fetchCurrentLead,
}) => {
  const [leadType, setLeadType] = useState(
    editFormData?.lead_type || currentLead?.lead_type || "INDIVIDUAL PAN"
  );
  const [panLoading, setPanLoading] = useState(false);
  const [panError, setPanError] = useState(null);
  const [panFetched, setPanFetched] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState([]);
  const [panVerifiedData, setPanVerifiedData] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(editFormData.lead_response_id || "");

  // ---- States (for autocomplete) ----
  const [stateList, setStateList] = useState([]);         // [{state_name, code}, ...]
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setStateLoading(true);
      setStateError(null);
      try {
        const res = await axiosInstance.get("/state/");
        const items = Array.isArray(res?.data?.states) ? res.data.states : [];
        if (!cancel) setStateList(items);
      } catch (err) {
        if (!cancel) setStateError("Failed to load states");
        ErrorHandling?.({ error: err });
      } finally {
        if (!cancel) setStateLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // NEW: track which fields were populated by PAN and should be locked
  const [panLocked, setPanLocked] = useState({
    pan: false,           // keep PAN editable in edit mode (we won't lock this)
    full_name: false,
    father_name: false,
    dob: false,
    address: false,
    city: false,
    state: false,
    district: false,
    pincode: false,
    country: false,
    aadhaar: false,
    gender: false,
  });

  const isFilled = (v) => v != null && String(v).trim() !== "";

  useEffect(() => {
    let cancelled = false;

    loadRecommendationTypes(axiosInstance)
      .then((items) => {
        if (cancelled) return;
        setSegmentOptions(items.map((seg) => ({ value: seg, label: seg })));
      })
      .catch(() => {
        if (!cancelled) setSegmentOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep lead_type in sync
  useEffect(() => {
    if (isEditMode) {
      setEditFormData((p) => ({ ...p, lead_type: leadType }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadType]);

  // PAN lookup
  const verifyPan = async (pan) => {
    try {
      const res = await axiosInstance.post(
        "/micro-pan-verification",
        new URLSearchParams({ pannumber: pan }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return res.data;
    } catch (err) {
      throw err?.response?.data?.detail || err?.message || "PAN verification failed";
    }
  };

  // Handle any input change
  const handleInputChange = useCallback(
    async (e) => {
      const { name, value, type, checked } = e.target;
      let newVal = value;

      // Mobile is read-only: ignore any attempts to change
      if (name === "mobile") return;
      // NEW: normalize DOB to YYYY-MM-DD so both manual DD-MM-YYYY and picker work
      if (name === "dob") {
        const ymd = toYMD(newVal);
        setEditFormData((p) => ({ ...p, dob: ymd }));
        return;
      }

      // Update form state
      setEditFormData((p) => ({
        ...p,
        [name]: type === "checkbox" ? checked : newVal,
      }));

      // Auto-uppercase PAN
      if (name === "pan") newVal = value.toUpperCase();

      // Trigger PAN fetch on full PAN
      if (name === "pan" && newVal.length === 10) {
        setPanLoading(true);
        setPanError(null);
        try {
          const data = await verifyPan(newVal);
          if (data.success && data.data?.result) {
            const r = data.data.result;
            setPanVerifiedData(r);
            setPanFetched(true);
            setEditFormData((p) => ({
              ...p,
              full_name: r.user_full_name || p.full_name,
              father_name: r.user_father_name || p.father_name,
              dob: r.user_dob ? toYMD(r.user_dob) : p.dob,
              address: r.user_address?.full || p.address,
              city: r.user_address?.city || p.city,
              state: r.user_address?.state || p.state,
              pincode: r.user_address?.zip || p.pincode,
              country: r.user_address?.country || p.country,
              aadhaar: r.masked_aadhaar || p.aadhaar,
              gender:
                r.user_gender === "M"
                  ? "Male"
                  : r.user_gender === "F"
                    ? "Female"
                    : p.gender,
            }));
            const addr = r.user_address || {};
            setPanLocked({
              pan: false,
              full_name: isFilled(r.user_full_name),
              father_name: isFilled(r.user_father_name),
              dob: isFilled(r.user_dob),
              address: isFilled(addr.full),
              city: isFilled(addr.city),
              state: isFilled(addr.state),
              district: isFilled(addr.district),
              pincode: isFilled(addr.zip),
              country: isFilled(addr.country),
              aadhaar: isFilled(r.masked_aadhaar),
              gender: isFilled(r.user_gender),
            });
            toast.success("PAN verified and autofilled!");
          } else {
            throw new Error("Verification failed");
          }
        } catch (err) {
          setPanError(err.toString());
          ErrorHandling({ error: err });
        } finally {
          setPanLoading(false);
        }
      }

      // Also update lead_type toggle
      if (name === "lead_type") setLeadType(newVal);
    },
    [setEditFormData]
  );

  if (!currentLead) return null;

  // Get response name by id (lowercased)
  // Forward response selection to parent so it can open FT/Callback modals
  const handleResponseSelect = (newId) => {
    const idNum = Number(newId);
    setEditFormData((p) => ({ ...p, lead_response_id: idNum }));
    handleLeadResponseChange(currentLead, idNum);
  };

  // Compute labels
  const sourceLabel =
    leadSources.find((s) => s.value === editFormData.lead_source_id)?.label ||
    "—";
  const responseLabel =
    leadResponses.find((r) => r.value === editFormData.lead_response_id)
      ?.label || "—";

  // Fields config
  const personalIndividual = [
    { name: "pan", label: "PAN Number", icon: CreditCard, placeholder: "Enter PAN" },
    { name: "mobile", label: "Mobile", icon: Phone, type: "tel", placeholder: "Enter mobile" },
    { name: "full_name", label: "Full Name", icon: User, placeholder: "Enter full name" },
    { name: "father_name", label: "Father Name", icon: User, placeholder: "Enter father name" },
    { name: "aadhaar", label: "Aadhaar Number", icon: CreditCard, placeholder: "Enter Aadhaar" },
    { name: "email", label: "Email", icon: Mail, type: "email", placeholder: "Enter email" },
    { name: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
    { name: "age", label: "Age", icon: Calendar, type: "number", readonly: true },
    {
      name: "gender",
      label: "Gender",
      icon: User,
      type: "select",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      name: "marital_status",
      label: "Marital Status",
      icon: User,
      type: "select",
      options: [
        { value: "Single", label: "Single" },
        { value: "Married", label: "Married" },
        { value: "Divorced", label: "Divorced" },
        { value: "Widowed", label: "Widowed" },
      ],
    },
    { name: "alternate_mobile", label: "Alternate Mobile", icon: Phone, type: "tel" },
    { name: "gstin", label: "GSTIN", icon: Building, placeholder: "Enter GSTIN" },
  ];

  const personalCompany = [
    { name: "pan", label: "Company PAN", icon: CreditCard, placeholder: "Enter Company PAN" },
    { name: "company_name", label: "Company Name", icon: User, placeholder: "Enter company name" },
    { name: "director_name", label: "Director Name", icon: User, placeholder: "Enter director name" },
    { name: "gstin", label: "GSTIN", icon: Building, placeholder: "Enter GSTIN" },
    { name: "mobile", label: "Mobile", icon: Phone, type: "tel", placeholder: "Enter mobile" },
    { name: "alternate_mobile", label: "Alternate Mobile", icon: Phone, type: "tel" },
    { name: "email", label: "Email", icon: Mail, type: "email", placeholder: "Enter email" },
  ];

  const addressFields = [
    { name: "city", label: "City", icon: MapPin, placeholder: "Enter city" },
    { name: "state", label: "State", icon: MapPin, placeholder: "Enter state" },
    { name: "district", label: "District", icon: MapPin, placeholder: "Enter district" },
    { name: "pincode", label: "Pincode", icon: MapPin, placeholder: "Enter pincode" },
    { name: "country", label: "Country", icon: Globe, placeholder: "Enter country" },
    { name: "address", label: "Address", icon: MapPin, type: "textarea", placeholder: "Enter address" },
  ];

  const professionalFields = [
    { name: "occupation", label: "Occupation", icon: Briefcase, placeholder: "Enter occupation" },
    {
      name: "experience",
      className: "w-full py-3",
      label: "Experience",
      icon: Briefcase,
      type: "select",
      options: [
        { value: "0-1", label: "0-1 year" },
        { value: "1-5", label: "1-5 years" },
        { value: "5-10", label: "5-10 years" },
        { value: "10-15", label: "10-15 years" },
        { value: "15+", label: "15+ years" },
      ],
    },
    { name: "segment", label: "Segment", type: "multiselect", options: segmentOptions, icon: Briefcase },
  ];

  const isLocked = (name) => {
    if (!isEditMode) return true;
    if (name === "mobile") return true;
    return !!panLocked[name];
    // default (unlocked) handled by InputField's isEditMode prop
  };

  const shortEmail = (email) => {
    const raw = String(email || "").trim();
    if (!raw) return "";
    if (raw.length <= 18) return raw;
    const at = raw.indexOf("@");
    if (at === -1) return raw.slice(0, 10) + "…..";
    const local = raw.slice(0, at);
    return `${local}@…..`;
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Top summary card */}
      <div
        className="px-6 py-3 rounded-2xl shadow-md"
        style={{
          background: "var(--theme-card-bg,#ffffff)",
          color: "var(--theme-text,#0f172a)",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Lead Type */}
          <div>
            <label
              htmlFor="lead_type"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              Lead Type
            </label>
            {isEditMode ? (
              <select
                id="lead_type"
                name="lead_type"
                value={leadType}
                onChange={handleInputChange}
                className="w-full h-12 px-4 rounded-lg transition"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text,#0f172a)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                  outline: "none",
                }}
              >
                <option value="INDIVIDUAL PAN">Individual PAN</option>
                <option value="COMPANY PAN">Company PAN</option>
              </select>
            ) : (
              <span
                className="block w-full px-4 py-2 rounded-lg"
                style={{
                  background: "var(--theme-panel,#f8fafc)",
                  color: "var(--theme-text,#0f172a)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                }}
              >
                {leadType}
              </span>
            )}
          </div>

          {/* Lead Source */}
          <div>
            <label
              htmlFor="lead_source_id"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              Lead Source
            </label>
            <InputField
              id="lead_source_id"
              name="lead_source_id"
              value={sourceLabel}
              isEditMode={false}
              className="w-full h-12"
            />
          </div>

          {/* Lead Response */}
          <div>
            <label
              htmlFor="lead_response_id"
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              Lead Response
            </label>

            {isEditMode ? (
              <select
                id="lead_response_id"
                name="lead_response_id"
                value={String(editFormData.lead_response_id ?? "")}
                onChange={(e) => handleResponseSelect(e.target.value)}
                className="w-full h-12 px-3 rounded-lg"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text,#0f172a)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                  outline: "none",
                }}
              >
                <option value="">Select Response</option>
                {leadResponses.map((resp) => (
                  <option key={resp.value} value={resp.value}>
                    {resp.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="lead_response_id"
                name="lead_response_id"
                value={String(editFormData.lead_response_id ?? "")}
                onChange={(e) => handleResponseSelect(e.target.value)}
                className="w-full h-12 px-3 rounded-lg"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text,#0f172a)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                  outline: "none",
                }}
              >
                <option value="">Select Response</option>
                {leadResponses.map((resp) => (
                  <option key={resp.value} value={resp.value}>
                    {resp.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Personal / Company */}
      <section
        className="p-6 rounded-lg shadow"
        style={{ background: "var(--theme-card-bg,#ffffff)", color: "var(--theme-text,#0f172a)" }}
      >
        <h3
          className="flex items-center text-lg font-semibold mb-5"
          style={{ color: "var(--theme-text,#0f172a)" }}
        >
          <User
            className="mr-2"
            size={20}
            style={{ color: "var(--theme-primary,#4f46e5)" }}
          />
          {leadType === "COMPANY" ? "Company Details" : "Personal Information"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(leadType === "COMPANY" ? personalCompany : personalIndividual).map((f) => {
            if (f.name === "age") {
              return (
                <InputField
                  key={f.name}
                  {...f}
                  value={calculateAge(editFormData.dob)}
                  isEditMode={false}
                />
              );
            }

            if (f.name === "pan") {
              return (
                <InputField
                  key={f.name}
                  {...f}
                  value={editFormData.pan}
                  isEditMode={isEditMode}
                  onInputChange={handleInputChange}
                  suffix={panLoading ? <MiniLoader /> : null}
                  autoCapitalize="characters"
                />
              );
            }

            if (f.name === "email") {
              if (isEditMode) {
                return (
                  <InputField
                    key={f.name}
                    {...f}
                    value={editFormData.email}
                    isEditMode
                    onInputChange={handleInputChange}
                  />
                );
              }
              return (
                <div key="email">
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--theme-text-muted,#64748b)" }}
                  >
                    {f.label || "Email"}
                  </label>
                  <div
                    className="px-3 py-2 rounded border overflow-hidden truncate"
                    title={editFormData.email || ""}
                    style={{
                      background: "var(--theme-panel,#f8fafc)",
                      borderColor: "var(--theme-border,#e5e7eb)",
                      color: "var(--theme-text,#0f172a)",
                    }}
                  >
                    {shortEmail(editFormData.email) || "—"}
                  </div>
                </div>
              );
            }

            return (
              <InputField
                key={f.name}
                {...f}
                value={editFormData[f.name]}
                isEditMode={!isLocked(f.name)}
                onInputChange={handleInputChange}
              />
            );
          })}
        </div>
      </section>

      {/* Address */}
      <section
        className="p-6 rounded-lg shadow"
        style={{ background: "var(--theme-card-bg,#ffffff)", color: "var(--theme-text,#0f172a)" }}
      >
        <h3
          className="flex items-center text-lg font-semibold mb-5"
          style={{ color: "var(--theme-text,#0f172a)" }}
        >
          <MapPin
            className="mr-2"
            size={20}
            style={{ color: "var(--theme-success,#16a34a)" }}
          />
          Address Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {addressFields.map((f) => {
            if (f.name === "address") {
              return (
                <div key={f.name} className="md:col-span-4">
                  <InputField
                    {...f}
                    value={editFormData.address}
                    isEditMode={!isLocked("address")}
                    onInputChange={handleInputChange}
                  />
                </div>
              );
            }

            if (f.name === "state") {
              if (isLocked("state")) {
                return (
                  <InputField
                    key="state"
                    {...f}
                    value={editFormData.state}
                    isEditMode={false}
                    onInputChange={handleInputChange}
                  />
                );
              }

              return (
                <div key="state">
                  <StateAutocomplete
                    value={editFormData.state || ""}
                    disabled={false}
                    busy={stateLoading}
                    list={stateList}
                    error={stateError}
                    onPick={(picked) => {
                      if (!picked) {
                        setEditFormData((p) => ({ ...p, state: "", state_code: null }));
                        return;
                      }
                      setEditFormData((p) => ({
                        ...p,
                        state: picked.state_name || "",
                        state_code: picked.code ?? null,
                      }));
                    }}
                  />
                </div>
              );
            }

            return (
              <InputField
                key={f.name}
                {...f}
                value={editFormData[f.name]}
                isEditMode={!isLocked(f.name)}
                onInputChange={handleInputChange}
              />
            );
          })}
        </div>
      </section>

      {/* Professional & Docs */}
      <section
        className="p-6 rounded-lg shadow mb-6"
        style={{ background: "var(--theme-card-bg,#ffffff)", color: "var(--theme-text,#0f172a)" }}
      >
        <h3
          className="flex items-center text-lg font-semibold mb-5"
          style={{ color: "var(--theme-text,#0f172a)" }}
        >
          <Briefcase
            className="mr-2"
            size={20}
            style={{ color: "var(--theme-primary,#4f46e5)" }}
          />
          Professional & Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {professionalFields.map((f) => {
            if (f.name === "lead_source_id") {
              return (
                <InputField
                  key={f.name}
                  {...f}
                  value={editFormData.lead_source_id}
                  isEditMode={false}
                  options={leadSources}
                />
              );
            }
            if (f.name === "segment") {
              return (
                <div key="segment">
                  <label
                    className="block mb-1 font-medium"
                    style={{ color: "var(--theme-text,#0f172a)" }}
                  >
                    Segment
                  </label>
                  {isEditMode ? (
                    <MultiSelectWithCheckboxes
                      options={segmentOptions}
                      value={
                        Array.isArray(editFormData.segment)
                          ? editFormData.segment
                          : []
                      }
                      onChange={(vals) =>
                        setEditFormData((p) => ({ ...p, segment: vals }))
                      }
                    />
                  ) : (
                    <div
                      className="px-3 py-2 rounded border"
                      style={{
                        background: "var(--theme-panel,#f8fafc)",
                        borderColor: "var(--theme-border,#e5e7eb)",
                        color: "var(--theme-text,#0f172a)",
                      }}
                    >
                      {editFormData.segment?.length
                        ? editFormData.segment.join(", ")
                        : "—"}
                    </div>
                  )}
                </div>
              );
            }
            if (f.name === "lead_response_id") {
              const sel = editFormData.lead_response_id ?? currentLead.lead_response_id;
              const lbl = leadResponses.find((r) => r.value === sel)?.label.toLowerCase();

              return (
                <div key="lead_response_id" className="md:col-span-2">
                  <InputField
                    {...f}
                    value={sel}
                    isEditMode={isEditMode}
                    onInputChange={(e) => handleResponseSelect(e.target.value)}
                    options={leadResponses}
                  />

                  {isEditMode && lbl === "ft" && (
                    <div className="flex gap-2 mt-2">
                      <InputField
                        label="FT From"
                        name="ft_from_date"
                        type="date"
                        value={editFormData.ft_from_date || ""}
                        isEditMode
                        onInputChange={handleInputChange}
                      />
                      <InputField
                        label="FT To"
                        name="ft_to_date"
                        type="date"
                        value={editFormData.ft_to_date || ""}
                        isEditMode
                        onInputChange={handleInputChange}
                      />
                    </div>
                  )}
                  {isEditMode && lbl === "call back" && (
                    <div className="mt-2">
                      <InputField
                        label="Call Back Date"
                        name="call_back_date"
                        type="datetime-local"
                        value={editFormData.call_back_date || ""}
                        isEditMode
                        onInputChange={handleInputChange}
                      />
                    </div>
                  )}

                  {!isEditMode && lbl === "ft" && (
                    <div className="mt-2 text-sm" style={{ color: "var(--theme-primary,#4f46e5)" }}>
                      <div>
                        <strong>FT From:</strong>{" "}
                        {currentLead.ft_from_date
                          ? formatDDMMYYYY(currentLead.ft_from_date)
                          : "—"}
                      </div>
                      <div>
                        <strong>FT To:</strong>{" "}
                        {currentLead.ft_to_date
                          ? formatDDMMYYYY(currentLead.ft_to_date)
                          : "—"}
                      </div>
                    </div>
                  )}
                  {!isEditMode && lbl === "call back" && (
                    <div className="mt-2 text-sm" style={{ color: "var(--theme-primary,#4f46e5)" }}>
                      <strong>Call Back:</strong>{" "}
                      {currentLead.call_back_date
                        ? new Date(currentLead.call_back_date).toLocaleString()
                        : "—"}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <InputField
                key={f.name}
                {...f}
                value={editFormData[f.name]}
                isEditMode={isEditMode}
                onInputChange={handleInputChange}
                options={f.options || []}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};
