"use client";

import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance, BASE_URL } from "@/api/Axios";

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
  openDropdown,
  setOpenDropdown,
}) {
  if (!isModalOpen) return null;

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");

  const [recTypes, setRecTypes] = useState([]);
  const [recTypesLoading, setRecTypesLoading] = useState(false);
  const [recTypesError, setRecTypesError] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // NEW: local error bag for required fields
  const [errors, setErrors] = useState({});

  // --- Load SMS templates ----------------------------------------------------
  useEffect(() => {
    let alive = true;
    const run = async () => {
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
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  // --- Load Recommendation Types --------------------------------------------
  useEffect(() => {
    let alive = true;
    const run = async () => {
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
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  // --- Template selection ----------------------------------------------------
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
    setErrors((prev) => ({ ...prev, smsTemplate: undefined })); // clear template error
  };

  // --- Live placeholder replacement -----------------------------------------
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

  // --- Validation helpers ----------------------------------------------------
  const isNonEmpty = (v) => String(v ?? "").trim().length > 0;
  const hasImage =
    !!formData.graph &&
    ((formData.graph instanceof File) ||
      (typeof formData.graph === "string" && formData.graph.trim() !== ""));

  const validate = () => {
    const e = {};

    if (!isNonEmpty(formData.stock_name)) e.stock_name = "Stock Name is required.";
    if (!isNonEmpty(formData.entry_price)) e.entry_price = "Entry Price is required.";
    if (!isNonEmpty(formData.stop_loss)) e.stop_loss = "Stop Loss is required.";
    if (!isNonEmpty(formData.targets)) e.targets = "Target 1 is required.";

    if (!Array.isArray(formData.recommendation_type) || formData.recommendation_type.length === 0) {
      e.recommendation_type = "Select at least one Recommendation Type.";
    }

    // Accept either a chosen template ID or any non-empty message that came from a template
    // new
if (!isEditMode && !(selectedTemplateId || isNonEmpty(formData.message))) {
  e.smsTemplate = "Please select an SMS Template.";
}

    if (!isEditMode && !hasImage) {
  e.graph = "Please upload an image.";
}

    setErrors(e);
    // also surface image error in your existing error slot
    setImageError?.(e.graph || "");

    return Object.keys(e).length === 0;
  };

  // intercept submit → validate → then call parent handleSubmit
  const onSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      handleSubmit(e);
    } else {
      // scroll first error into view (nice touch)
      const el =
        document.querySelector("[data-error='true']") ||
        document.querySelector(".field-error");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // --- Render ---------------------------------------------------------------
  const errorCls = "border-red-500 ring-2 ring-red-100";
  const helpCls = "text-xs mt-1 text-red-600 field-error";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-auto relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-3 text-gray-500 text-2xl"
          onClick={() => setIsModalOpen(false)}
        >
          &times;
        </button>
        <h2 className="text-xl font-semibold mb-4">
          {editId ? "Edit Rational" : "Create Rational"}
        </h2>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock fields */}
          <div className="flex flex-col" data-error={errors.stock_name ? "true" : "false"}>
            <label className="mb-1 text-gray-700 text-sm">Stock Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="stock_name"
              value={formData.stock_name ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.stock_name) setErrors((p) => ({ ...p, stock_name: undefined }));
              }}
              className={`p-3 border rounded ${errors.stock_name ? errorCls : ""}`}
              disabled={isEditMode}
            />
            {errors.stock_name && <div className={helpCls}>{errors.stock_name}</div>}
          </div>

          <div className="flex flex-col" data-error={errors.entry_price ? "true" : "false"}>
            <label className="mb-1 text-gray-700 text-sm">Entry Price <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="entry_price"
              value={formData.entry_price ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.entry_price) setErrors((p) => ({ ...p, entry_price: undefined }));
              }}
              className={`p-3 border rounded ${errors.entry_price ? errorCls : ""}`}
              disabled={isEditMode}
            />
            {errors.entry_price && <div className={helpCls}>{errors.entry_price}</div>}
          </div>

          <div className="flex flex-col" data-error={errors.stop_loss ? "true" : "false"}>
            <label className="mb-1 text-gray-700 text-sm">Stop Loss <span className="text-red-500">*</span></label>
            <input
              type="number"
              name="stop_loss"
              value={formData.stop_loss ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.stop_loss) setErrors((p) => ({ ...p, stop_loss: undefined }));
              }}
              className={`p-3 border rounded ${errors.stop_loss ? errorCls : ""}`}
              disabled={isEditMode}
            />
            {errors.stop_loss && <div className={helpCls}>{errors.stop_loss}</div>}
          </div>

          <div className="flex flex-col" data-error={errors.targets ? "true" : "false"}>
            <label className="mb-1 text-gray-700 text-sm">
              Targets 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="targets"
              value={formData.targets ?? ""}
              onChange={(e) => {
                handleChange(e);
                if (errors.targets) setErrors((p) => ({ ...p, targets: undefined }));
              }}
              className={`p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.targets ? errorCls : ""}`}
              disabled={isEditMode}
            />
            {errors.targets && <div className={helpCls}>{errors.targets}</div>}
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 2</label>
            <input
              type="number"
              name="targets2"
              value={formData.targets2 ?? ""}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 3</label>
            <input
              type="number"
              name="targets3"
              value={formData.targets3 ?? ""}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>

          {/* Recommendation Type (required) */}
          <div className="flex flex-col md:col-span-2 relative" data-error={errors.recommendation_type ? "true" : "false"}>
            <label className="mb-1 text-gray-700 text-sm font-medium">
              Recommendation Type <span className="text-red-500">*</span>
            </label>

            <div
              onClick={() => {
                if (!isEditMode && !recTypesLoading) setOpenDropdown((prev) => !prev);
              }}
              className={`p-3 border border-black rounded-lg bg-white cursor-pointer transition-all duration-200 flex items-center justify-between ${
                isEditMode ? "bg-gray-50 cursor-not-allowed text-gray-500 pointer-events-none" : ""
              } ${errors.recommendation_type ? errorCls : ""}`}
            >
              <div className="flex flex-wrap gap-1">
                {formData.recommendation_type?.length > 0 ? (
                  formData.recommendation_type.map((type) => (
                    <span
                      key={type}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">
                    {recTypesLoading ? "Loading..." : "Select Recommendation Type"}
                  </span>
                )}
              </div>

              {!isEditMode && (
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ml-2 flex-shrink-0 ${openDropdown ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {errors.recommendation_type && <div className={helpCls}>{errors.recommendation_type}</div>}

            {!isEditMode && openDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 mb-1">
                    {formData.recommendation_type?.length || 0} selected
                  </div>
                  {formData.recommendation_type?.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, recommendation_type: [] }))
                      }
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {recTypesError && (
                  <div className="px-4 py-3 text-sm text-red-600">{recTypesError}</div>
                )}

                {!recTypesError &&
                  (recTypesLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Loading…</div>
                  ) : recTypes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No types found</div>
                  ) : (
                    recTypes.map((option) => (
                      <label
                        key={option}
                        className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
                          checked={formData.recommendation_type?.includes(option)}
                          onChange={() => {
                            const current = formData.recommendation_type || [];
                            const updated = current.includes(option)
                              ? current.filter((item) => item !== option)
                              : [...current, option];
                            setFormData((prev) => ({ ...prev, recommendation_type: updated }));
                            if (errors.recommendation_type && updated.length > 0) {
                              setErrors((p) => ({ ...p, recommendation_type: undefined }));
                            }
                          }}
                        />
                        <span className="text-gray-800 font-medium">{option}</span>
                        {formData.recommendation_type?.includes(option) && (
                          <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </label>
                    ))
                  ))}

                <div className="p-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(false)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700 transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Done ({formData.recommendation_type?.length || 0} selected)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SMS Template (required) */}
          <div className="col-span-2" data-error={errors.smsTemplate ? "true" : "false"}>
            <div className="flex flex-col md:col-span-2 relative">
              <label className="mb-1 text-gray-700 text-sm font-medium">
                SMS Template <span className="text-red-500">*</span>
              </label>

              <select
                onChange={handleSelect}
                value={selectedTemplateId ?? ""}
                className={`p-3 border rounded-lg bg-white cursor-pointer border-black transition-all duration-200 ${errors.smsTemplate ? errorCls : ""}`}
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
                  <label className="mt-4 mb-1 text-gray-700 text-sm font-medium">SMS Body</label>
                  <textarea
                    readOnly
                    className="p-3 border border-gray-300 rounded-lg bg-gray-50 w-full h-32 text-sm text-gray-800"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, message: e.target.value || "" }))
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* Status (kept as-is) */}
          {!isEditMode && (
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-gray-700 text-sm">Status</label>
              <select
                name="status"
                value={formData.status || "OPEN"}
                onChange={handleChange}
                className="p-3 border rounded"
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

{/* Rational + Image (image required only in create mode) */}
<div className="flex flex-col md:col-span-2 relative" data-error={errors.graph ? "true" : "false"}>
  <label className="mb-1 text-gray-700 text-sm">Rational</label>
  <textarea
    name="rational"
    value={formData.rational ?? ""}
    onChange={handleChange}
    className="p-3 border rounded"
    rows={3}
  />

  {/* Everything related to image is hidden in edit mode */}
  {!isEditMode && (
    <>
      <div className="mt-2 flex justify-end">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFormData((prev) => ({
              ...prev,
              graph: e.target.files?.[0] ?? null,
            }));
            setErrors((p) => ({ ...p, graph: undefined }));
            if (e.target.files?.[0]) setImageError("");
          }}
          className="hidden"
          id="rationalImageUpload"
        />
        <label
          htmlFor="rationalImageUpload"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm transition"
          title="Upload image"
        >
          Upload Image <span className="text-red-300">*</span>
        </label>
      </div>

      {(imageError || errors.graph) && (
        <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
          {errors.graph || imageError}
        </div>
      )}

      {formData.graph && (
        <div className="mt-2 relative inline-block w-fit">
          <img
            src={
              formData.graph instanceof File
                ? URL.createObjectURL(formData.graph)
                : `${BASE_URL}${formData.graph}`
            }
            alt="Preview"
            className="max-h-20 rounded border"
          />
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, graph: null }))}
            className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
            title="Remove Image"
          >
            ×
          </button>
        </div>
      )}
    </>
  )}
</div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors duration-150"
            >
              {editId ? "Update Rational" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RationalModal;
