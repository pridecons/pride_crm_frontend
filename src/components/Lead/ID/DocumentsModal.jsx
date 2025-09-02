import React from "react";
import { Modal } from "@/components/Lead/ID/Modal";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";
import { ErrorHandling } from "@/helper/ErrorHandling";

const getFileUrl = (path) => {
  if (!path) return null;
  const clean = path.startsWith("/") ? path : `/static/lead_documents/${path}`;
  const base = axiosInstance.defaults.baseURL.replace("/api/v1", "");
  return `${base}${clean}`;
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
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Upload Lead Documents"
      actions={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Close
        </button>,
        <button
          key="upload"
          onClick={async () => {
            if (!aadharFront && !aadharBack && !panPic) {
               ErrorHandling({defaultError: "Please select at least one file to upload."});
              return;
            }
            try {
              const formData = new FormData();
              if (aadharFront) formData.append("aadhar_front", aadharFront);
              if (aadharBack) formData.append("aadhar_back", aadharBack);
              if (panPic) formData.append("pan_pic", panPic);

              await axiosInstance.post(`/leads/${currentLead.id}/upload-documents`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
              toast.success("Documents uploaded successfully!");
              onClose();
              onUploaded?.();
              // reset chosen files & previews
              setAadharFront(null); setAadharBack(null); setPanPic(null);
              setAadharFrontPreview(null); setAadharBackPreview(null); setPanPicPreview(null);
            } catch (err) {
               ErrorHandling({ error: err, defaultError: "Error uploading documents"});
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Upload
        </button>,
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Aadhaar Front */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Aadhaar Front</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
            className="w-full border rounded p-2"
          />
          {aadharFrontPreview ? (
            <img src={aadharFrontPreview} alt="Aadhaar Front Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
          ) : currentLead?.aadhar_front_pic ? (
            <a href={getFileUrl(currentLead.aadhar_front_pic)} target="_blank" rel="noopener noreferrer">
              <img src={getFileUrl(currentLead.aadhar_front_pic)} alt="Aadhaar Front" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
            </a>
          ) : (
            <p className="text-gray-400 text-xs">Not uploaded</p>
          )}
        </div>

        {/* Aadhaar Back */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Aadhaar Back</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharBack, setAadharBackPreview)}
            className="w-full border rounded p-2"
          />
          {aadharBackPreview ? (
            <img src={aadharBackPreview} alt="Aadhaar Back Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
          ) : currentLead?.aadhar_back_pic ? (
            <a href={getFileUrl(currentLead.aadhar_back_pic)} target="_blank" rel="noopener noreferrer">
              <img src={getFileUrl(currentLead.aadhar_back_pic)} alt="Aadhaar Back" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
            </a>
          ) : (
            <p className="text-gray-400 text-xs">Not uploaded</p>
          )}
        </div>

        {/* PAN Card */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">PAN Card</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setPanPic, setPanPicPreview)}
            className="w-full border rounded p-2"
          />
          {panPicPreview ? (
            <img src={panPicPreview} alt="PAN Card Preview" className="mt-2 w-32 h-24 object-cover border rounded" />
          ) : currentLead?.pan_pic ? (
            <a href={getFileUrl(currentLead.pan_pic)} target="_blank" rel="noopener noreferrer">
              <img src={getFileUrl(currentLead.pan_pic)} alt="PAN Card" className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition" />
            </a>
          ) : (
            <p className="text-gray-400 text-xs">Not uploaded</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
