// import React from "react";
// import { Modal } from "@/components/Lead/ID/Modal";
// import { axiosInstance, BASE_URL } from "@/api/Axios";
// import toast from "react-hot-toast";
// import { ErrorHandling } from "@/helper/ErrorHandling";

// const getFileUrl = (path) => {
//   if (!path) return null;
//   const clean = path.startsWith("/") ? path : `/static/lead_documents/${path}`;
//   return `${BASE_URL}${clean}`;
// };

// export default function DocumentsModal({
//   open,
//   onClose,
//   currentLead,

//   // file state from parent (unchanged)
//   aadharFront, aadharBack, panPic,
//   aadharFrontPreview, aadharBackPreview, panPicPreview,
//   setAadharFront, setAadharBack, setPanPic,
//   setAadharFrontPreview, setAadharBackPreview, setPanPicPreview,
//   handleFileChange,

//   onUploaded, // callback: e.g. fetchCurrentLead
// }) {
//   return (
//     <Modal
//       isOpen={open}
//       onClose={onClose}
//       title="Upload Lead Documents"
//      contentClassName="pt-6 px-6 w-[80vw] max-w-4xl rounded-xl shadow-2xl bg-white flex flex-col"
//       actions={[
//         <button
//           key="close"
//           onClick={onClose}
//           className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
//         >
//           Close
//         </button>,
//         <button
//           key="upload"
//           onClick={async () => {
//             if (!aadharFront && !aadharBack && !panPic) {
//                ErrorHandling({defaultError: "Please select at least one file to upload."});
//               return;
//             }
//             try {
//               const formData = new FormData();
//               if (aadharFront) formData.append("aadhar_front", aadharFront);
//               if (aadharBack) formData.append("aadhar_back", aadharBack);
//               if (panPic) formData.append("pan_pic", panPic);

//               await axiosInstance.post(`/leads/${currentLead.id}/upload-documents`, formData, {
//                 headers: { "Content-Type": "multipart/form-data" },
//               });
//               toast.success("Documents uploaded successfully!");
//               onClose();
//               onUploaded?.();
//               // reset chosen files & previews
//               setAadharFront(null); setAadharBack(null); setPanPic(null);
//               setAadharFrontPreview(null); setAadharBackPreview(null); setPanPicPreview(null);
//             } catch (err) {
//                ErrorHandling({ error: err, defaultError: "Error uploading documents"});
//             }
//           }}
//           className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
//         >
//           Upload
//         </button>,
//       ]}
//     >
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
//         {/* Aadhaar Front */}
//         <div className="space-y-2">
//           <label className="block text-sm font-medium">Aadhaar Front</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
//             className="w-full border rounded p-2"
//           />
//           {aadharFrontPreview ? (
//             <img src={aadharFrontPreview} alt="Aadhaar Front Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
//           ) : currentLead?.aadhar_front_pic ? (
//             <a href={getFileUrl(currentLead.aadhar_front_pic)} target="_blank" rel="noopener noreferrer">
//               <img src={getFileUrl(currentLead.aadhar_front_pic)} alt="Aadhaar Front" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
//             </a>
//           ) : (
//             <p className="text-gray-400 text-xs">Not uploaded</p>
//           )}
//         </div>

//         {/* Aadhaar Back */}
//         <div className="space-y-2">
//           <label className="block text-sm font-medium">Aadhaar Back</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => handleFileChange(e, setAadharBack, setAadharBackPreview)}
//             className="w-full border rounded p-2"
//           />
//           {aadharBackPreview ? (
//             <img src={aadharBackPreview} alt="Aadhaar Back Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
//           ) : currentLead?.aadhar_back_pic ? (
//             <a href={getFileUrl(currentLead.aadhar_back_pic)} target="_blank" rel="noopener noreferrer">
//               <img src={getFileUrl(currentLead.aadhar_back_pic)} alt="Aadhaar Back" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
//             </a>
//           ) : (
//             <p className="text-gray-400 text-xs">Not uploaded</p>
//           )}
//         </div>

//         {/* PAN Card */}
//         <div className="space-y-2">
//           <label className="block text-sm font-medium">PAN Card</label>
//           <input
//             type="file"
//             accept="image/*"
//             onChange={(e) => handleFileChange(e, setPanPic, setPanPicPreview)}
//             className="w-full border rounded p-2"
//           />
//           {panPicPreview ? (
//             <img src={panPicPreview} alt="PAN Card Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
//           ) : currentLead?.pan_pic ? (
//             <a href={getFileUrl(currentLead.pan_pic)} target="_blank" rel="noopener noreferrer">
//               <img src={getFileUrl(currentLead.pan_pic)} alt="PAN Card" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
//             </a>
//           ) : (
//             <p className="text-gray-400 text-xs">Not uploaded</p>
//           )}
//         </div>
//       </div>
//     </Modal>
//   );
// }

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
  loading = false 
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onChange({ target: { files } });
    }
  }, [onChange]);

  const hasContent = preview || existingFile;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : hasContent 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && document.getElementById(`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`).click()}
      >
        <input
          id={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
          type="file"
          accept="image/*"
          onChange={onChange}
          className="hidden"
          disabled={loading}
        />
        
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Processing...</span>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-2">
              {hasContent ? (
                <svg className="mx-auto h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {hasContent ? 'Click to replace file' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>

      {/* Preview/Existing Image */}
      {(preview || existingFile) && (
        <div className="relative">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              {preview ? (
                <img 
                  src={preview} 
                  alt={`${label} Preview`} 
                  className="w-16 h-16 object-cover rounded border shadow-sm"
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
                    className="w-16 h-16 object-cover rounded border shadow-sm hover:shadow-md transition-shadow"
                  />
                </a>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {preview ? 'New file selected' : 'Current file'}
                </p>
                <p className="text-xs text-gray-500">
                  {preview ? 'Ready to upload' : 'Click image to view full size'}
                </p>
              </div>
            </div>
            
            {preview && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Remove file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {!hasContent && (
        <p className="text-gray-400 text-xs italic">Not uploaded</p>
      )}
    </div>
  );
};

export default function DocumentsModal({
  open,
  onClose,
  currentLead,

  // file state from parent (unchanged)
  aadharFront, aadharBack, panPic,
  aadharFrontPreview, aadharBackPreview, panPicPreview,
  setAadharFront, setAadharBack, setPanPic,
  setAadharFrontPreview, setAadharBackPreview, setPanPicPreview,
  handleFileChange,

  onUploaded, // callback: e.g. fetchCurrentLead
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Enhanced file validation
  const validateFile = useCallback((file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, and GIF files are allowed');
    }
    
    return true;
  }, []);

  // Enhanced file change handler with validation
  const enhancedHandleFileChange = useCallback((e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      handleFileChange(e, setFile, setPreview);
    } catch (error) {
      ErrorHandling({ defaultError: error.message });
      e.target.value = ''; // Reset input
    }
  }, [handleFileChange, validateFile]);

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
    return hasFilesToUpload || 
           (!currentLead?.aadhar_front_pic && !currentLead?.aadhar_back_pic && !currentLead?.pan_pic);
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

      await axiosInstance.post(`/leads/${currentLead.id}/upload-documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ overall: progress });
        }
      });

      toast.success("Documents uploaded successfully!");
      onClose();
      onUploaded?.();
      
      // Reset chosen files & previews
      setAadharFront(null); setAadharBack(null); setPanPic(null);
      setAadharFrontPreview(null); setAadharBackPreview(null); setPanPicPreview(null);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Error uploading documents" });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [
    hasFilesToUpload, currentLead?.id, aadharFront, aadharBack, panPic,
    onClose, onUploaded, setAadharFront, setAadharBack, setPanPic,
    setAadharFrontPreview, setAadharBackPreview, setPanPicPreview
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
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l6-6m0 0l6 6m-6-6v12" />
          </svg>
          <span>Upload Lead Documents</span>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"     
             >
            <X size={20} />
              </button> 
        </div>
      }
      contentClassName="pt-6 px-6 w-[90vw] max-w-5xl rounded-xl shadow-2xl bg-white flex flex-col max-h-[90vh]"
      actions={[
        <button
          key="close"
          onClick={handleClose}
          disabled={uploading}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Close'}
        </button>,
        <button
          key="upload"
          onClick={handleUpload}
          disabled={!hasFilesToUpload || uploading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Uploading... {uploadProgress.overall}%</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Documents</span>
            </>
          )}
        </button>,
      ]}
    >
      {/* Upload Progress Bar */}
      {uploading && (
        <div className="mb-4 px-6">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.overall || 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {hasChanges && (
        <div className="mb-4 px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-blue-700">
                {hasFilesToUpload 
                  ? `${[aadharFront, aadharBack, panPic].filter(Boolean).length} file(s) ready to upload`
                  : 'No new files selected'
                }
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
          onChange={(e) => enhancedHandleFileChange(e, setAadharFront, setAadharFrontPreview)}
          onRemove={() => removeFile(setAadharFront, setAadharFrontPreview)}
          loading={uploading}
        />

        <DocumentUploadField
          label="Aadhaar Back"
          file={aadharBack}
          preview={aadharBackPreview}
          existingFile={currentLead?.aadhar_back_pic}
          onChange={(e) => enhancedHandleFileChange(e, setAadharBack, setAadharBackPreview)}
          onRemove={() => removeFile(setAadharBack, setAadharBackPreview)}
          loading={uploading}
        />

        <DocumentUploadField
          label="PAN Card"
          file={panPic}
          preview={panPicPreview}
          existingFile={currentLead?.pan_pic}
          onChange={(e) => enhancedHandleFileChange(e, setPanPic, setPanPicPreview)}
          onRemove={() => removeFile(setPanPic, setPanPicPreview)}
          loading={uploading}
        />
      </div>
    </Modal>
  );
}