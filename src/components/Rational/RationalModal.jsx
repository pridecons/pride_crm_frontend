"use client";

import React, { useEffect, useState } from "react";
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
  openDropdown,         // (now unused but kept for compatibility)
  setOpenDropdown,      // (now unused but kept for compatibility)
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

  // local error bag
  const [errors, setErrors] = useState({});

  // --- Load SMS templates ----------------------------------------------------
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
    return () => { alive = false; };
  }, []);

  // --- Load Recommendation Types --------------------------------------------
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
    return () => { alive = false; };
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
    setErrors((prev) => ({ ...prev, smsTemplate: undefined }));
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

    // Create mode: require a template selection OR a message already filled via template
    if (!isEditMode && !(selectedTemplateId || isNonEmpty(formData.message))) {
      e.smsTemplate = "Please select an SMS Template.";
    }

    setErrors(e);
    setImageError?.(e.graph || "");
    return Object.keys(e).length === 0;
  };

  // intercept submit → validate → then parent handleSubmit
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

  const errorCls = "border-red-500 ring-2 ring-red-100";
  const helpCls = "text-xs mt-1 text-red-600 field-error";

  // --- UI helpers ------------------------------------------------------------
  const toggleRecType = (option) => {
    if (isEditMode) return; // keep same behavior as before
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
            <label className="mb-1 text-gray-700 text-sm">
              Stock Name <span className="text-red-500">*</span>
            </label>
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
            <label className="mb-1 text-gray-700 text-sm">
              Entry Price <span className="text-red-500">*</span>
            </label>
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
            <label className="mb-1 text-gray-700 text-sm">
              Stop Loss <span className="text-red-500">*</span>
            </label>
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

          {/* Recommendation Type (inline checkboxes) */}
          <div
            className="md:col-span-2"
            data-error={errors.recommendation_type ? "true" : "false"}
          >
            <label className="mb-1 text-gray-700 text-sm font-medium">
              Recommendation Type <span className="text-red-500">*</span>
            </label>

            {recTypesError && (
              <div className="text-sm text-red-600 mb-2">{recTypesError}</div>
            )}

            {recTypesLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : recTypes.length === 0 ? (
              <div className="text-sm text-gray-500">No types found</div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded ${errors.recommendation_type ? errorCls : ""} ${isEditMode ? "bg-gray-50 pointer-events-none opacity-80" : ""}`}
              >
                {recTypes.map((option) => {
                  const checked = formData.recommendation_type?.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={!!checked}
                        onChange={() => toggleRecType(option)}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {errors.recommendation_type && (
              <div className={helpCls}>{errors.recommendation_type}</div>
            )}
          </div>

          {/* Send On (SMS/WhatsApp/Email) */}
          <div className="md:col-span-2">
            <label className="mb-1 text-gray-700 text-sm font-medium">Send On</label>
            <div className="flex flex-wrap gap-4 p-3 border rounded">
              {["SMS", "whatsapp", "Email"].map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={!!formData?.sent_on_msg?.[ch]}
                    onChange={() => toggleChannel(ch)}
                  />
                  <span>{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SMS Template (required in create) */}
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

          {/* Status (create only) */}
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
