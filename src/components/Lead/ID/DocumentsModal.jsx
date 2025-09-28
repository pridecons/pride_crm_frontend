// DocumentsModal.jsx
import React, { useState, useCallback, useMemo } from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance, BASE_URL } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { X } from "lucide-react";

const getFileUrl = (path) => {
  if (!path) return null;
  const clean = path.startsWith("/") ? path : `/static/lead_documents/${path}`;
  return `${BASE_URL}${clean}`;
};

const DocumentUploadField = ({
  label,
  file,
  preview,
  existingFile,
  onChange,
  onRemove,
  loading = false,
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onChange({ target: { files } });
      }
    },
    [onChange]
  );

  const hasContent = preview || existingFile;
  const inputId = `file-input-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="space-y-3">
      <label
        className="block text-sm font-semibold"
        style={{ color: "var(--theme-text,#0f172a)" }}
      >
        {label}
      </label>

      {/* Upload Area */}
      <div
        className="relative border-2 border-dashed rounded-lg p-4 transition-all duration-200"
        style={{
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          background: dragOver
            ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 10%, var(--theme-card-bg,#fff))"
            : hasContent
            ? "color-mix(in srgb, var(--theme-success,#22c55e) 10%, var(--theme-card-bg,#fff))"
            : "var(--theme-card-bg,#fff)",
          borderColor: dragOver
            ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 55%, transparent)"
            : hasContent
            ? "color-mix(in srgb, var(--theme-success,#22c55e) 45%, transparent)"
            : "var(--theme-border,#e5e7eb)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          onChange={onChange}
          className="hidden"
          disabled={loading}
        />

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{ borderColor: "var(--theme-primary,#4f46e5)" }}
            ></div>
            <span
              className="ml-2 text-sm"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              Processing...
            </span>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-2">
              {hasContent ? (
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--theme-success,#22c55e)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--theme-text-muted,#94a3b8)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>
            <p
              className="text-sm"
              style={{ color: "var(--theme-text-muted,#64748b)" }}
            >
              {hasContent ? "Click to replace file" : "Click to upload or drag and drop"}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--theme-text-muted,#94a3b8)" }}
            >
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Preview/Existing Image */}
      {(preview || existingFile) && (
        <div className="relative">
          <div
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{
              background: "var(--theme-panel,#f8fafc)",
              borderColor: "var(--theme-border,#e5e7eb)",
            }}
          >
            <div className="flex items-center space-x-3">
              {preview ? (
                <img
                  src={preview}
                  alt={`${label} Preview`}
                  className="w-16 h-16 object-cover rounded border shadow-sm"
                  style={{ borderColor: "var(--theme-border,#e5e7eb)" }}
                />
              ) : (
                <a
                  href={getFileUrl(existingFile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={getFileUrl(existingFile)}
                    alt={label}
                    className="w-16 h-16 object-cover rounded border shadow-sm transition-shadow"
                    style={{ borderColor: "var(--theme-border,#e5e7eb)" }}
                  />
                </a>
              )}
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--theme-text,#0f172a)" }}
                >
                  {preview ? "New file selected" : "Current file"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--theme-text-muted,#64748b)" }}
                >
                  {preview ? "Ready to upload" : "Click image to view full size"}
                </p>
              </div>
            </div>

            {preview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1 rounded transition-colors"
                title="Remove file"
                style={{ color: "var(--theme-danger,#dc2626)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "color-mix(in srgb, var(--theme-danger,#dc2626) 10%, transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {!hasContent && (
        <p
          className="text-xs italic"
          style={{ color: "var(--theme-text-muted,#94a3b8)" }}
        >
          Not uploaded
        </p>
      )}
    </div>
  );
};

export default function DocumentsModal({
  open,
  onClose,
  currentLead,

  // file state from parent (unchanged)
  aadharFront,
  aadharBack,
  panPic,
  aadharFrontPreview,
  aadharBackPreview,
  panPicPreview,
  setAadharFront,
  setAadharBack,
  setPanPic,
  setAadharFrontPreview,
  setAadharBackPreview,
  setPanPicPreview,
  handleFileChange,

  onUploaded, // callback: e.g. fetchCurrentLead
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Enhanced file validation
  const validateFile = useCallback((file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

    if (file.size > maxSize) {
      throw new Error("File size must be less than 10MB");
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPEG, PNG, and GIF files are allowed");
    }

    return true;
  }, []);

  // Enhanced file change handler with validation
  const enhancedHandleFileChange = useCallback(
    (e, setFile, setPreview) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        validateFile(file);
        handleFileChange(e, setFile, setPreview);
      } catch (error) {
        ErrorHandling({ defaultError: error.message });
        e.target.value = ""; // Reset input
      }
    },
    [handleFileChange, validateFile]
  );

  // Remove file handlers
  const removeFile = useCallback((setFile, setPreview) => {
    setFile(null);
    setPreview(null);
  }, []);

  // Check if any files are selected for upload
  const hasFilesToUpload = useMemo(() => {
    return !!(aadharFront || aadharBack || panPic);
  }, [aadharFront, aadharBack, panPic]);

  // Check if there are any changes from existing files
  const hasChanges = useMemo(() => {
    return (
      hasFilesToUpload ||
      (!currentLead?.aadhar_front_pic &&
        !currentLead?.aadhar_back_pic &&
        !currentLead?.pan_pic)
    );
  }, [hasFilesToUpload, currentLead]);

  const handleUpload = useCallback(async () => {
    if (!hasFilesToUpload) {
      ErrorHandling({ defaultError: "Please select at least one file to upload." });
      return;
    }

    setUploading(true);
    setUploadProgress({ overall: 0 });

    try {
      const formData = new FormData();
      if (aadharFront) formData.append("aadhar_front", aadharFront);
      if (aadharBack) formData.append("aadhar_back", aadharBack);
      if (panPic) formData.append("pan_pic", panPic);

      await axiosInstance.post(
        `/leads/${currentLead.id}/upload-documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress({ overall: progress });
          },
        }
      );

      toast.success("Documents uploaded successfully!");
      onClose();
      onUploaded?.();

      // Reset chosen files & previews
      setAadharFront(null);
      setAadharBack(null);
      setPanPic(null);
      setAadharFrontPreview(null);
      setAadharBackPreview(null);
      setPanPicPreview(null);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Error uploading documents" });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [
    hasFilesToUpload,
    currentLead?.id,
    aadharFront,
    aadharBack,
    panPic,
    onClose,
    onUploaded,
    setAadharFront,
    setAadharBack,
    setPanPic,
    setAadharFrontPreview,
    setAadharBackPreview,
    setPanPicPreview,
  ]);

  const handleClose = useCallback(() => {
    if (uploading) {
      toast.error("Cannot close while uploading. Please wait for upload to complete.");
      return;
    }
    onClose();
  }, [uploading, onClose]);

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: "var(--theme-primary,#4f46e5)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l6-6m0 0l6 6m-6-6v12"
            />
          </svg>
          <span style={{ color: "var(--theme-text,#0f172a)" }}>
            Upload Lead Documents
          </span>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="ml-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
            title="Close"
            style={{ color: "var(--theme-text-muted,#64748b)" }}
          >
            <X size={20} />
          </button>
        </div>
      }
      contentClassName="pt-6 px-6 w-[90vw] max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
      actions={[
        <button
          key="close"
          onClick={handleClose}
          disabled={uploading}
          className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--theme-muted,#f1f5f9)",
            color: "var(--theme-text,#0f172a)",
            border: "1px solid var(--theme-border,#e5e7eb)",
          }}
        >
          {uploading ? "Uploading..." : "Close"}
        </button>,
        <button
          key="upload"
          onClick={handleUpload}
          disabled={!hasFilesToUpload || uploading}
          className="px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--theme-primary,#4f46e5)",
            color: "var(--theme-primary-contrast,#fff)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--theme-primary-hover,#4338ca)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--theme-primary,#4f46e5)";
          }}
        >
          {uploading ? (
            <>
              <div
                className="animate-spin rounded-full h-4 w-4 border-b-2"
                style={{ borderColor: "var(--theme-primary-contrast,#fff)" }}
              ></div>
              <span>Uploading... {uploadProgress.overall}%</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--theme-primary-contrast,#fff)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Upload Documents</span>
            </>
          )}
        </button>,
      ]}
    >
      {/* Modal body background themed */}
      <div
        className="flex-1 flex flex-col"
        style={{ background: "var(--theme-card-bg,#ffffff)" }}
      >
        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mb-4 px-6">
            <div
              className="rounded-full h-2"
              style={{ background: "var(--theme-muted,#e5e7eb)" }}
            >
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress.overall || 0}%`,
                  background: "var(--theme-primary,#4f46e5)",
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Status Summary */}
        {hasChanges && (
          <div className="mb-4 px-6">
            <div
              className="rounded-lg p-3 border"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-primary,#4f46e5) 8%, var(--theme-card-bg,#fff))",
                borderColor:
                  "color-mix(in srgb, var(--theme-primary,#4f46e5) 35%, var(--theme-border,#e5e7eb))",
              }}
            >
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--theme-primary,#4f46e5)" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span
                  className="text-sm"
                  style={{ color: "var(--theme-text,#0f172a)" }}
                >
                  {hasFilesToUpload
                    ? `${[aadharFront, aadharBack, panPic].filter(Boolean).length} file(s) ready to upload`
                    : "No new files selected"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto flex-1">
          <DocumentUploadField
            label="Aadhaar Front"
            file={aadharFront}
            preview={aadharFrontPreview}
            existingFile={currentLead?.aadhar_front_pic}
            onChange={(e) =>
              enhancedHandleFileChange(e, setAadharFront, setAadharFrontPreview)
            }
            onRemove={() => removeFile(setAadharFront, setAadharFrontPreview)}
            loading={uploading}
          />

          <DocumentUploadField
            label="Aadhaar Back"
            file={aadharBack}
            preview={aadharBackPreview}
            existingFile={currentLead?.aadhar_back_pic}
            onChange={(e) =>
              enhancedHandleFileChange(e, setAadharBack, setAadharBackPreview)
            }
            onRemove={() => removeFile(setAadharBack, setAadharBackPreview)}
            loading={uploading}
          />

          <DocumentUploadField
            label="PAN Card"
            file={panPic}
            preview={panPicPreview}
            existingFile={currentLead?.pan_pic}
            onChange={(e) =>
              enhancedHandleFileChange(e, setPanPic, setPanPicPreview)
            }
            onRemove={() => removeFile(setPanPic, setPanPicPreview)}
            loading={uploading}
          />
        </div>
      </div>
    </Modal>
  );
}
