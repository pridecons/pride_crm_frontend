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
  import { useFTAndCallbackPatch } from "../useFTAndCallbackPatch";

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

  // Utility: calculate age from YYYY-MM-DD
  function calculateAge(dob) {
    if (!dob) return "";
    const birth = new Date(dob);
    const diff = Date.now() - birth.getTime();
    return Math.floor(diff / (365 * 24 * 60 * 60 * 1000));
  }

  // Utility: format ISO datetime to DD-MM-YYYY
  function formatDDMMYYYY(dt) {
    const d = new Date(dt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
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
    const { showFTModal, setShowFTModal, showCallBackModal, setShowCallBackModal, handleResponseChange } =
      useFTAndCallbackPatch({
        responses: leadResponses.map(r => ({ id: r.value, name: r.label })),
        onPatched: fetchCurrentLead,
      });


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
                dob: r.user_dob ? r.user_dob.split("T")[0] : p.dob,
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
              toast.success("PAN verified and autofilled!");
            } else {
              throw new Error("Verification failed");
            }
          } catch (err) {
            setPanError(err.toString());
            toast.error(err.toString());
          } finally {
            setPanLoading(false);
          }
        }

        // Update form state
        setEditFormData((p) => ({
          ...p,
          [name]: type === "checkbox" ? checked : newVal,
        }));
        // Also update lead_type toggle
        if (name === "lead_type") setLeadType(newVal);
      },
      [setEditFormData]
    );

    if (!currentLead) return null;

    // Get response name by id (lowercased)
const getResponseNameById = (id) => {
  const r = leadResponses.find((x) => x.value === Number(id));
  return (r?.label || "").toLowerCase();
};

// One gatekeeper for both selects (view/edit)
const handleResponseSelectSafely = (newId, mode /* "view" | "edit" */) => {
  const resp = getResponseNameById(newId);
  const wantsFT = resp === "ft";
  const wantsCB = resp === "call back" || resp === "callback";

  const hasFTDates = Boolean(editFormData.ft_from_date && editFormData.ft_to_date);
  const hasCBDate  = Boolean(editFormData.call_back_date);

  // FT must have both dates
  if (wantsFT && !hasFTDates) {
    toast.error("Please select FT From and To dates first.");
    if (mode === "view") {
      // revert UI selection in view mode (since there is no Save)
      setEditFormData((p) => ({ ...p, lead_response_id: currentLead.lead_response_id }));
    } else {
      // in edit mode, keep local change so user can see & fill dates,
      // but DO NOT patch yet
      setEditFormData((p) => ({ ...p, lead_response_id: Number(newId) }));
    }
    return;
  }

  // Call Back must have a date/time
  if (wantsCB && !hasCBDate) {
    toast.error("Please select a Call Back date first.");
    if (mode === "view") {
      setEditFormData((p) => ({ ...p, lead_response_id: currentLead.lead_response_id }));
    } else {
      setEditFormData((p) => ({ ...p, lead_response_id: Number(newId) }));
    }
    return;
  }

  // Dates are present or it's a different response → allow patch
  setEditFormData((p) => ({ ...p, lead_response_id: Number(newId) }));
  handleLeadResponseChange(currentLead, Number(newId));
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
      { name: "aadhaar", label: "Aadhaar Number", icon: CreditCard, placeholder: "Enter Aadhaar" },
      { name: "full_name", label: "Full Name", icon: User, placeholder: "Enter full name" },
      { name: "father_name", label: "Father Name", icon: User, placeholder: "Enter father name" },
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
      { name: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
      { name: "age", label: "Age", icon: Calendar, type: "number", readonly: true },
      { name: "mobile", label: "Mobile", icon: Phone, type: "tel", placeholder: "Enter mobile" },
      { name: "alternate_mobile", label: "Alternate Mobile", icon: Phone, type: "tel" },
      { name: "email", label: "Email", icon: Mail, type: "email", placeholder: "Enter email" },
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

    // Which fields to lock after PAN fetched or saved
    const lockedFields = [
      "pan",
      "full_name",
      "father_name",
      "dob",
      "address",
      "city",
      "state",
      "pincode",
      "country",
      "aadhaar",
      "gender",
      "mobile",
    ];
    const isLocked = (name) => {
      // always allow editing PAN
      if (name === "pan") {
        return !isEditMode; // lock PAN if not in edit mode
      }

      return (
        !isEditMode ||
        (currentLead.pan && lockedFields.includes(name)) ||
        (panFetched && lockedFields.includes(name))
      );
    };

    return (
      <div className="flex flex-col gap-6">

        <div className="bg-white px-6 py-3 rounded-2xl shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Lead Type */}
            <div>
              <label htmlFor="lead_type" className="block text-sm font-medium text-gray-600 mb-1">
                Lead Type
              </label>
              {isEditMode ? (
                <select
                  id="lead_type"
                  name="lead_type"
                  value={leadType}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                >
                  <option value="INDIVIDUAL PAN">Individual PAN</option>
                  <option value="COMPANY PAN">Company PAN</option>
                </select>
              ) : (
                <span className="block w-full px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                  {leadType}
                </span>
              )}
            </div>

            {/* Lead Source */}
            <div>
              <label htmlFor="lead_source_id" className="block text-sm font-medium text-gray-600 mb-1">
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
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                Lead Response
              </label>

              {isEditMode ? (
                // In edit mode, keep your existing dropdown
                <InputField
                  id="lead_response_id"
                  name="lead_response_id"
                  value={editFormData.lead_response_id}
                  isEditMode
                  onInputChange={(e) => handleResponseSelectSafely(e.target.value, "edit")}
                  options={leadResponses}
                  className="w-full"
                />
              ) : (
                // In view mode, make it editable with a dropdown
                <select
                  id="lead_response_id"
                  name="lead_response_id"
                  value={editFormData.lead_response_id || ""}
                  onChange={(e) => handleResponseSelectSafely(e.target.value, "view")}
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-5">
            <User className="mr-2 text-blue-500" size={20} />
            {leadType === "COMPANY" ? "Company Details" : "Personal Information"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(leadType === "COMPANY" ? personalCompany : personalIndividual).map((f) => {
              // Age field
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
              // PAN field with loader
              if (f.name === "pan") {
                return (
                  <InputField
                    key={f.name}
                    {...f}
                    value={editFormData.pan}
                    isEditMode={!isLocked("pan")}
                    onInputChange={handleInputChange}
                    suffix={panLoading ? <MiniLoader /> : null}
                    autoCapitalize="characters"
                  />
                );
              }
              // Locked fields after PAN
              if (lockedFields.includes(f.name)) {
                return (
                  <InputField
                    key={f.name}
                    {...f}
                    value={editFormData[f.name]}
                    isEditMode={!isLocked(f.name)}
                    onInputChange={handleInputChange}
                  />
                );
              }
              // Everything else
              return (
                <InputField
                  key={f.name}
                  {...f}
                  value={editFormData[f.name]}
                  isEditMode={isEditMode}
                  onInputChange={handleInputChange}
                />
              );
            })}
          </div>
        </section>

        {/* Address */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-5">
            <MapPin className="mr-2 text-green-500" size={20} />
            Address Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {addressFields.map((f) =>
              f.name === "address" ? (
                <div key={f.name} className="md:col-span-4">
                  <InputField
                    {...f}
                    value={editFormData.address}
                    isEditMode={isEditMode}
                    onInputChange={handleInputChange}
                  />
                </div>
              ) : (
                <InputField
                  key={f.name}
                  {...f}
                  value={editFormData[f.name]}
                  isEditMode={isEditMode}
                  onInputChange={handleInputChange}
                />
              )
            )}
          </div>
        </section>

        {/* Professional & Docs */}
        <section className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-5">
            <Briefcase className="mr-2 text-purple-500" size={20} />
            Professional & Documentation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {professionalFields.map((f) => {
              // Lead Source always readonly
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
              // Segment multiselect
              if (f.name === "segment") {
                return (
                  <div key="segment">
                    <label className="block mb-1 text-gray-700 font-medium">
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
                      <div className="px-3 py-2 bg-gray-50 rounded">
                        {editFormData.segment?.length
                          ? editFormData.segment.join(", ")
                          : "—"}
                      </div>
                    )}
                  </div>
                );
              }
              // Lead Response + inline FT / Callback
              if (f.name === "lead_response_id") {
                const sel = editFormData.lead_response_id ?? currentLead.lead_response_id;
                const lbl = leadResponses.find((r) => r.value === sel)?.label.toLowerCase();

                return (
                  <div key="lead_response_id" className="md:col-span-2">
                    <InputField
                      {...f}
                      value={sel}
                      isEditMode={isEditMode}
                      onInputChange={(e) => handleResponseSelectSafely(e.target.value, isEditMode ? "edit" : "view")}
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
                      <div className="mt-2 text-sm text-blue-700">
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
                      <div className="mt-2 text-sm text-indigo-700">
                        <strong>Call Back:</strong>{" "}
                        {currentLead.call_back_date
                          ? new Date(currentLead.call_back_date).toLocaleString()
                          : "—"}
                      </div>
                    )}
                  </div>
                );
              }
              // Default
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
