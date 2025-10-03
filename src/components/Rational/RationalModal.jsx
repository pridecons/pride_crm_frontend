"use client";

import React, { useEffect, useState } from "react";
import { axiosInstance, BASE_URL } from "@/api/Axios";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { useTheme } from "@/context/ThemeContext";

function RationalModal({
  isEditMode,
  isModalOpen,
  setIsModalOpen,
  formData,
  setFormData,
  editId,
  handleChange,
  handleSubmit,
  imageError,
  setImageError,
  openDropdown, // (unused)
  setOpenDropdown, // (unused)
}) {
  if (!isModalOpen) return null;

  const { themeConfig } = useTheme();

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");

  const [recTypes, setRecTypes] = useState([]);
  const [recTypesLoading, setRecTypesLoading] = useState(false);
  const [recTypesError, setRecTypesError] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [planTypeOptions, setPlanTypeOptions] = useState([]);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);

  const [errors, setErrors] = useState({});

  const apiHasGraph =
    !!isEditMode && typeof formData.graph === "string" && formData.graph.trim() !== "";
  const localHasFile = formData.graph instanceof File;
  const hasAnyImage = apiHasGraph || localHasFile;

  /* -------------------- Load SMS templates -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setTemplatesLoading(true);
      setTemplatesError("");
      try {
        const res = await axiosInstance.get("/sms-templates/");
        const data = Array.isArray(res?.data) ? res.data : [];
        if (alive) setTemplates(data);
      } catch (err) {
        console.error("Failed to fetch templates", err);
        if (alive) setTemplatesError("Failed to load templates.");
      } finally {
        if (alive) setTemplatesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-select template if formData.templateId is prefilled
  useEffect(() => {
    if (!templates?.length || !formData?.templateId) return;
    const t = templates.find(
      (x) =>
        String(x?.dlt_template_id) === String(formData.templateId) ||
        String(x?.id) === String(formData.templateId)
    );
    if (t) {
      setSelectedTemplateId(t.id);
      setSelectedTemplate(t.template || "");
      if (!formData.message) {
        setFormData((prev) => ({ ...prev, message: t.template || "" }));
      }
      setErrors((prev) => ({ ...prev, smsTemplate: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, formData?.templateId]);

  /* -------------------- Plan Types -------------------- */
  useEffect(() => {
    fetchPlanTypeOptions();
  }, []);

  const fetchPlanTypeOptions = async () => {
    try {
      const res = await axiosInstance.get("/services/plan-types");
      setPlanTypeOptions(res.data || []);
    } catch (error) {
      ErrorHandling({
        error,
        defaultError: "Failed to fetch plan types",
      });
    }
  };

  /* -------------------- Recommendation Types -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setRecTypesLoading(true);
      setRecTypesError("");
      try {
        const res = await axiosInstance.get("/profile-role/recommendation-type");
        const items = Array.isArray(res?.data) ? res.data : [];
        if (alive) setRecTypes(items);
      } catch (err) {
        console.error("Failed to fetch recommendation types", err);
        if (alive) setRecTypesError("Failed to load recommendation types.");
      } finally {
        if (alive) setRecTypesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* -------------------- Template selection -------------------- */
  const handleSelect = (e) => {
    const id = parseInt(e.target.value);
    setSelectedTemplateId(id);
    const template = templates.find((t) => t.id === id);
    setFormData((prev) => ({
      ...prev,
      message: template?.template || "",
      templateId: template?.dlt_template_id || "",
    }));
    setSelectedTemplate(template?.template || "");
    setErrors((prev) => ({ ...prev, smsTemplate: undefined }));
  };

  /* -------------------- Live placeholder replacement -------------------- */
  useEffect(() => {
    if (!selectedTemplate) return;
    const temp = selectedTemplate
      ?.replace("{stock_name}", formData.stock_name ?? "")
      ?.replace("{entry_price}", formData.entry_price ?? "")
      ?.replace("{stop_loss}", formData.stop_loss ?? "")
      ?.replace(
        "{targets}",
        `${formData.targets ?? ""}${
          formData.targets2 ? `-${formData.targets2}` : ""
        }${formData.targets3 ? `-${formData.targets3}` : ""}`
      );
    setFormData((prev) => ({ ...prev, message: temp || "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTemplate,
    formData.stock_name,
    formData.entry_price,
    formData.stop_loss,
    formData.targets,
    formData.targets2,
    formData.targets3,
  ]);

  /* -------------------- Validation -------------------- */
  const isNonEmpty = (v) => String(v ?? "").trim().length > 0;

  const validate = () => {
    const e = {};
    if (!isNonEmpty(formData.stock_name)) e.stock_name = "Stock Name is required.";
    if (!isNonEmpty(formData.entry_price)) e.entry_price = "Entry Price is required.";
    if (!isNonEmpty(formData.stop_loss)) e.stop_loss = "Stop Loss is required.";
    if (!isNonEmpty(formData.targets)) e.targets = "Target 1 is required.";
    if (
      !Array.isArray(formData.recommendation_type) ||
      formData.recommendation_type.length === 0
    ) {
      e.recommendation_type = "Select at least one Recommendation Type.";
    }
    if (!isEditMode && !(selectedTemplateId || isNonEmpty(formData.message))) {
      e.smsTemplate = "Please select an SMS Template.";
    }
    setErrors(e);
    setImageError?.(e.graph || "");
    return Object.keys(e).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      handleSubmit(e);
    } else {
      const el =
        document.querySelector("[data-error='true']") ||
        document.querySelector(".field-error");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const errorCls =
    "border-[var(--theme-danger)] ring-2 ring-[var(--theme-danger-soft)]";
  const helpCls = "text-xs mt-1 text-[var(--theme-danger)] field-error";

  /* -------------------- UI helpers -------------------- */
  const toggleRecType = (option) => {
    if (isEditMode) return;
    const current = formData.recommendation_type || [];
    const updated = current.includes(option)
      ? current.filter((x) => x !== option)
      : [...current, option];
    setFormData((prev) => ({ ...prev, recommendation_type: updated }));
    if (errors.recommendation_type && updated.length > 0) {
      setErrors((p) => ({ ...p, recommendation_type: undefined }));
    }
  };

  const toggleChannel = (key) => {
    setFormData((prev) => ({
      ...prev,
      sent_on_msg: {
        ...(prev.sent_on_msg || { SMS: false, whatsapp: false, Email: false }),
        [key]: !prev?.sent_on_msg?.[key],
      },
    }));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "var(--theme-backdrop)" }}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-3xl mx-auto relative max-h-[90vh] overflow-y-auto border"
        style={{
          background: "var(--theme-card-bg)",
          borderColor: "var(--theme-border)",
          color: "var(--theme-text)",
          boxShadow: `0 10px 25px ${themeConfig.shadow}`,
        }}
      >
        <button
          className="absolute top-3 right-3 text-xl"
          onClick={() => setIsModalOpen(false)}
          style={{ color: "var(--theme-text-muted)" }}
          title="Close"
        >
          &times;
        </button>

        <h2 className="text-xl font-semibold mb-4"> 
          {editId ? "Edit Rational" : "Create Rational"}
        </h2>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock Name */}
          <div className="flex flex-col" data-error={errors.stock_name ? "true" : "false"}>
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Stock Name <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <input
              type="text"
              name="stock_name"
              value={formData.stock_name ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.stock_name) setErrors((p) => ({ ...p, stock_name: undefined }));
              }}
              className={`p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                errors.stock_name ? errorCls : ""
              }`}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
            {errors.stock_name && <div className={helpCls}>{errors.stock_name}</div>}
          </div>

          {/* Entry Price */}
          <div className="flex flex-col" data-error={errors.entry_price ? "true" : "false"}>
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Entry Price <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <input
              type="number"
              name="entry_price"
              value={formData.entry_price ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.entry_price) setErrors((p) => ({ ...p, entry_price: undefined }));
              }}
              className={`p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                errors.entry_price ? errorCls : ""
              }`}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
            {errors.entry_price && <div className={helpCls}>{errors.entry_price}</div>}
          </div>

          {/* Stop Loss */}
          <div className="flex flex-col" data-error={errors.stop_loss ? "true" : "false"}>
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Stop Loss <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <input
              type="number"
              name="stop_loss"
              value={formData.stop_loss ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.stop_loss) setErrors((p) => ({ ...p, stop_loss: undefined }));
              }}
              className={`p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                errors.stop_loss ? errorCls : ""
              }`}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
            {errors.stop_loss && <div className={helpCls}>{errors.stop_loss}</div>}
          </div>

          {/* Targets 1 */}
          <div className="flex flex-col" data-error={errors.targets ? "true" : "false"}>
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Targets 1 <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <input
              type="number"
              name="targets"
              value={formData.targets ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.targets) setErrors((p) => ({ ...p, targets: undefined }));
              }}
              className={`p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                errors.targets ? errorCls : ""
              }`}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
            {errors.targets && <div className={helpCls}>{errors.targets}</div>}
          </div>

          {/* Targets 2 */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Targets 2
            </label>
            <input
              type="number"
              name="targets2"
              value={formData.targets2 ?? ""}
              onChange={handleChange}
              className="p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
          </div>

          {/* Targets 3 */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Targets 3
            </label>
            <input
              type="number"
              name="targets3"
              value={formData.targets3 ?? ""}
              onChange={handleChange}
              className="p-3 rounded border focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
              disabled={isEditMode}
            />
          </div>

          {/* Recommendation Type */}
          <div className="md:col-span-2" data-error={errors.recommendation_type ? "true" : "false"}>
            <label className="mb-1 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
              Recommendation Type <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>

            {recTypesError && (
              <div className="text-sm mb-2" style={{ color: "var(--theme-danger)" }}>
                {recTypesError}
              </div>
            )}

            {recTypesLoading ? (
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>Loading…</div>
            ) : recTypes.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>No types found</div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded border ${
                  errors.recommendation_type ? errorCls : ""
                } ${isEditMode ? "pointer-events-none opacity-80" : ""}`}
                style={{
                  background: isEditMode ? "var(--theme-surface)" : "transparent",
                  borderColor: "var(--theme-border)",
                }}
              >
                {recTypes.map((option) => {
                  const checked = formData.recommendation_type?.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      style={{ color: "var(--theme-text)" }}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={!!checked}
                        onChange={() => toggleRecType(option)}
                        style={{ accentColor: "var(--theme-primary)" }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {errors.recommendation_type && <div className={helpCls}>{errors.recommendation_type}</div>}
          </div>

          {/* Plan Type */}
          <div className="relative md:col-span-1">
            <label className="block mb-2 font-medium text-sm" style={{ color: "var(--theme-text)" }}>
              Plan Type <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowPlanDropdown((v) => !v)}
              className="w-full text-left rounded-xl px-4 py-3 border flex justify-between items-center"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
            >
              <span>{formData.planType ? formData.planType : "Select Plan Type"}</span>
              <svg
                className={`w-4 h-4 ml-2 transition-transform ${showPlanDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--theme-text-muted)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPlanDropdown && (
              <div
                className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl shadow-lg border"
                style={{
                  background: "var(--theme-card-bg)",
                  borderColor: "var(--theme-border)",
                  boxShadow: `0 10px 25px ${themeConfig.shadow}`,
                }}
              >
                {planTypeOptions.map((type) => (
                  <label
                    key={type}
                    className="flex items-center px-4 py-2 cursor-pointer"
                    style={{ color: "var(--theme-text)" }}
                  >
                    <input
                      type="radio"
                      name="planType"
                      checked={formData.planType === type}
                      onChange={() => setFormData((prev) => ({ ...prev, planType: type }))}
                      className="mr-2"
                      style={{ accentColor: "var(--theme-primary)" }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send On */}
          <div className="md:col-span-1">
            <label className="block mb-2 font-medium text-sm" style={{ color: "var(--theme-text)" }}>
              Send On <span style={{ color: "var(--theme-danger)" }}>*</span>
            </label>
            <div
              className="flex flex-wrap gap-4 p-4 rounded-xl border justify-between items-center"
              style={{
                background: "var(--theme-surface)",
                borderColor: "var(--theme-border)",
                color: "var(--theme-text)",
              }}
            >
              {["SMS", "whatsapp", "Email"].map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={!!formData?.sent_on_msg?.[ch]}
                    onChange={() => toggleChannel(ch)}
                    style={{ accentColor: "var(--theme-primary)" }}
                  />
                  <span>{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SMS Template */}
          <div className="md:col-span-2" data-error={errors.smsTemplate ? "true" : "false"}>
            <div className="flex flex-col relative">
              <label className="mb-1 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
                SMS Template <span style={{ color: "var(--theme-danger)" }}>*</span>
              </label>
              <select
                onChange={handleSelect}
                value={selectedTemplateId ?? ""}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  errors.smsTemplate ? errorCls : ""
                }`}
                style={{
                  background: "var(--theme-input-background)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border)",
                }}
                disabled={templatesLoading || !!templatesError}
              >
                <option value="" disabled>
                  {templatesLoading ? "Loading..." : templatesError ? "Failed to load" : "Select a template"}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              {errors.smsTemplate && <div className={helpCls}>{errors.smsTemplate}</div>}

              {formData.message && (
                <>
                  <label className="mt-4 mb-1 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
                    SMS Body
                  </label>
                  <textarea
                    readOnly
                    className="p-3 rounded-lg border w-full h-32 text-sm"
                    style={{
                      background: "var(--theme-surface)",
                      color: "var(--theme-text)",
                      borderColor: "var(--theme-border)",
                    }}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        message: e.target.value || "",
                      }))
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* Status (create only) */}
          {!isEditMode && (
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
                Status
              </label>
              <select
                name="status"
                value={formData.status || "OPEN"}
                onChange={handleChange}
                className="p-3 rounded border"
                style={{
                  background: "var(--theme-input-background)",
                  color: "var(--theme-text)",
                  borderColor: "var(--theme-border)",
                }}
                required
              >
                <option value="">Select Status</option>
                <option value="OPEN">OPEN</option>
                <option value="TARGET1_HIT">TARGET1</option>
                <option value="TARGET2_HIT">TARGET2</option>
                <option value="TARGET3_HIT">TARGET3</option>
                <option value="STOP_LOSS_HIT">STOP_LOSS</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          )}

          {/* Rational + Image */}
          <div className="flex flex-col md:col-span-2 relative" data-error={errors.graph ? "true" : "false"}>
            <label className="mb-1 text-sm" style={{ color: "var(--theme-text)" }}>
              Rational
            </label>
            <textarea
              name="rational"
              value={formData.rational ?? ""}
              onChange={handleChange}
              className="p-3 rounded border"
              rows={3}
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
              }}
            />

            {/* UPLOAD (no image yet) */}
            {!hasAnyImage && (
              <>
                <div className="mt-2 flex justify-end">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, graph: e.target.files?.[0] ?? null }));
                      setErrors((p) => ({ ...p, graph: undefined }));
                      if (e.target.files?.[0]) setImageError("");
                    }}
                    className="hidden"
                    id="rationalImageUpload"
                  />
                  <label
                    htmlFor="rationalImageUpload"
                    className="inline-block px-4 py-2 rounded shadow text-sm cursor-pointer transition"
                    style={{
                      background: "var(--theme-primary)",
                      color: "var(--theme-primary-contrast)",
                    }}
                    title="Upload image"
                  >
                    {isEditMode ? "Upload Image" : <>Upload Image <span style={{ color: "var(--theme-primary-contrast)" }}>*</span></>}
                  </label>
                </div>

                {!isEditMode && (imageError || errors.graph) && (
                  <div
                    className="mt-2 text-sm rounded p-2 border"
                    style={{
                      color: "var(--theme-danger)",
                      background: "var(--theme-danger-soft)",
                      borderColor: "var(--theme-danger)",
                    }}
                  >
                    {errors.graph || imageError}
                  </div>
                )}
              </>
            )}

            {/* PREVIEW (image exists) */}
            {hasAnyImage && (
              <div className="mt-2 relative inline-block w-fit">
                <img
                  src={localHasFile ? URL.createObjectURL(formData.graph) : `${BASE_URL}${formData.graph}`}
                  alt="Preview"
                  className="max-h-20 rounded border"
                  style={{ borderColor: "var(--theme-border)" }}
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, graph: null }))}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-sm flex items-center justify-center"
                  style={{
                    background: "var(--theme-danger)",
                    color: "var(--theme-on-danger, #fff)",
                  }}
                  title="Remove Image"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-3 rounded transition-colors"
              style={{
                background: "var(--theme-primary)",
                color: "var(--theme-primary-contrast)",
              }}
            >
              {editId ? "Update Rational" : "Submit"}
            </button>
          </div>
        </form>

        <style jsx>{`
          /* Hide arrows in WebKit browsers */
          .rational-modal input[type="number"]::-webkit-outer-spin-button,
          .rational-modal input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          /* Hide arrows in Firefox */
          .rational-modal input[type="number"] {
            -moz-appearance: textfield;
            appearance: textfield;
          }
        `}</style>
      </div>
    </div>
  );
}

export default RationalModal;
