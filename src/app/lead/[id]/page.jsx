// Main Lead Component
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { axiosInstance } from "@/api/Axios";
import { useParams } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  Edit3,
  Save,
  X,
  Eye,
  PhoneCall,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Globe,
} from "lucide-react";
import PaymentModel from "@/components/Fetch_Lead/PaymentModel";
import toast from "react-hot-toast";
// import { Viewer, Worker } from "@react-pdf-viewer/core";
// import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
// import "@react-pdf-viewer/core/lib/styles/index.css";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Cookies from "js-cookie";
import LoadingState from "@/components/LoadingState";
import { usePermissions } from "@/context/PermissionsContext";

// --- After all your imports, add this function ---
export const getFileUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.startsWith("/") ? path : `/static/lead_documents/${path}`;
  const baseURL = axiosInstance.defaults.baseURL.replace("/api/v1", "");
  return `${baseURL}${cleanPath}`;
};

const verifyPan = async (pan) => {
  try {
    const res = await axiosInstance.post("/pan/verify", { pan });
    return res.data; // Adjust if your API returns data in a different shape
  } catch (error) {
    throw error?.response?.data?.detail || error?.message || "PAN verification failed";
  }
};

// Utility: calculate age from dob string (yyyy-mm-dd or dd-mm-yyyy)
function calculateAge(dob) {
  if (!dob) return "";
  let [day, month, year] = ["", "", ""];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    // yyyy-mm-dd
    [year, month, day] = dob.split("-");
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    // dd-mm-yyyy
    [day, month, year] = dob.split("-");
  } else {
    return "";
  }
  const dobDate = new Date(`${year}-${month}-${day}`);
  const diffMs = Date.now() - dobDate.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

// Utility: format date as DD-MM-YYYY (for view)
function formatDDMMYYYY(dob) {
  if (!dob) return "";
  let d = new Date(dob);
  if (isNaN(d)) {
    // maybe already dd-mm-yyyy
    const parts = dob.split("-");
    if (parts.length === 3) {
      return dob;
    }
    return "";
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}


const Lead = () => {
  const { hasPermission } = usePermissions();
  const { id } = useParams();
  const [isOpenPayment, setIsOpenPayment] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpenSource, setIsOpenSource] = useState(false);
  const [isOpenResponse, setIsOpenResponse] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const [leadSources, setLeadSources] = useState([]);
  const [leadResponses, setLeadResponses] = useState([]);
  const [uncalledCount, setUncalledCount] = useState(0);

  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panPic, setPanPic] = useState(null);

  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [panPicPreview, setPanPicPreview] = useState(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEmailLogsModalOpen, setIsEmailLogsModalOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailContext, setEmailContext] = useState({ username: "" });
  const [contextFields, setContextFields] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isRecordingsModalOpen, setIsRecordingsModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycUrl, setKycUrl] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);


  const fetchRecordings = async () => {
    try {
      setLoadingRecordings(true);
      const { data } = await axiosInstance.get(`/recordings/lead/${id}`);
      setRecordings(data);
    } catch (err) {
      console.warn("No recordings available or failed to fetch.");
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const { data } = await axiosInstance.get(`/leads/${id}/comments`);
      setComments(data);
    } catch (err) {
      console.error("Error fetching comments:", err);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await axiosInstance.post(`/leads/${id}/comments`, null, {
        params: { comment: newComment },
      });
      toast.success("Comment added");
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error("Failed to add comment");
    }
  };

  const extractPlaceholders = (body = "") => {
    const regex = /{{(.*?)}}/g;
    let match;
    const fields = [];
    while ((match = regex.exec(body)) !== null) {
      fields.push(match[1].trim());
    }
    return fields;
  };

  useEffect(() => {
    if (isEmailModalOpen) {
      axiosInstance.get("/email/templates/")
        .then((res) => {
          setTemplates(res.data);
        })
        .catch((err) => {
          console.error("Error fetching templates:", err);
          toast.error("Failed to load templates");
        });
    }
  }, [isEmailModalOpen]);

  const handleSendEmail = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select an email template");
      return;
    }
    if (contextFields.some((f) => !emailContext[f])) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await axiosInstance.post("/email/send", {
        template_id: selectedTemplateId,
        recipient_email: currentLead?.email,
        context: emailContext,
      });
      toast.success("Email sent successfully!");
      setIsEmailModalOpen(false);
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Failed to send email");
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data } = await axiosInstance.get(`/email/logs/`, {
        params: { recipient_email: currentLead?.email },
      });
      setEmailLogs(data);
      setIsEmailLogsModalOpen(true);
    } catch (err) {
      console.error("Error fetching email logs:", err);
      toast.error("Failed to load logs");
    }
  };


  const fetchKycUserDetails = async () => {
    if (!currentLead?.mobile) {
      toast.error("Mobile number not found for this lead.");
      return;
    }
    setKycLoading(true);
    const formData = { mobile: currentLead?.mobile };
    try {
      await axiosInstance.post("/kyc_user_details", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });
      toast.success("KYC initiated successfully!");
      // Optionally refresh data
      // await fetchCurrentLead();
    } catch (err) {
      toast.error("Failed to initiate KYC: " + (err.response?.data?.detail || err.message));
    } finally {
      setKycLoading(false);
    }
  };

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    setter(file);

    // Revoke old preview if exists
    previewSetter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    return () => {
      if (aadharFrontPreview) URL.revokeObjectURL(aadharFrontPreview);
      if (aadharBackPreview) URL.revokeObjectURL(aadharBackPreview);
      if (panPicPreview) URL.revokeObjectURL(panPicPreview);
    };
  }, [aadharFrontPreview, aadharBackPreview, panPicPreview]);

  // Common API functions
  const apiCall = async (method, endpoint, data = null) => {
    try {
      const config = { method, url: endpoint };
      if (data) config.data = data;
      const response = await axiosInstance(config);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.detail || `Failed to ${method} ${endpoint}`);
    }
  };

  const fetchCurrentLead = async () => {
    try {
      setLoading(true);
      const response = await apiCall("GET", `/leads/${id}`);
      setCurrentLead(response);
      setEditFormData(response);

      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  const handleViewKyc = async () => {
    try {
      const { data } = await axiosInstance.post(`/agreement/view/${currentLead?.id}`);
      // Log to confirm!
      console.log("KYC view API response:", data);

      // Pick best available
      const signedUrl =
        data.complete_signed_url || data.signed_url || data.latest_signed_url;

      if (!signedUrl) {
        toast.error("Failed to get KYC document link!");
        return;
      }

      setKycUrl(signedUrl);
      setIsKycModalOpen(true);
    } catch (error) {
      console.error("Error fetching KYC document:", error);
      toast.error("Unable to fetch KYC document");
    }
  };

  const fetchData = async () => {
    try {
      const [sourcesRes, responsesRes, assignmentsRes, uncalledRes] =
        await Promise.all([
          apiCall("GET", "/lead-config/sources/?skip=0&limit=100"),
          apiCall("GET", "/lead-config/responses/?skip=0&limit=100"),
          apiCall("GET", "/leads/assignments/my"),
          apiCall("GET", "/leads/navigation/uncalled-count"),
        ]);

      // Normalize data for dropdowns
      setLeadSources(
        sourcesRes.map((src) => ({
          value: src.id,
          label: src.name,
        }))
      );
      setLeadResponses(
        responsesRes.map((res) => ({
          value: res.id,
          label: res.name,
        }))
      );
      setAssignments(assignmentsRes.assignments);
      setUncalledCount(uncalledRes.uncalled_count);
    } catch (err) {
      console.log("Error fetching data:", err);
    }
  };

  const fetchStories = async () => {
    try {
      setLoadingStories(true);
      const response = await apiCall("GET", `/leads/${id}/stories`);
      setStories(response);
    } catch (err) {
      toast.error("Failed to fetch stories");
      console.error(err);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleUpdateLead = async () => {
    try {
      setLoading(true);
      const updateData = { ...editFormData };

      if (updateData.dob) {
        updateData.dob = new Date(updateData.dob).toISOString().split("T")[0];
      }
      if (updateData.call_back_date) {
        updateData.call_back_date = new Date(updateData.call_back_date).toISOString();
      }

      if (updateData.segment && typeof updateData.segment === "string") {
        updateData.segment = updateData.segment.split(",").map((s) => s.trim()).filter((s) => s);
      }

      if (updateData.comment && typeof updateData.comment === "string") {
        updateData.comment = { text: updateData.comment };
      }

      // Step 1: Update lead
      const response = await apiCall("PUT", `/leads/${currentLead.id}`, updateData);
      setCurrentLead(response);
      setIsEditMode(false);

      // Step 2: Upload documents if selected
      if (aadharFront || aadharBack || panPic) {
        const formData = new FormData();
        if (aadharFront) formData.append("aadhar_front", aadharFront);
        if (aadharBack) formData.append("aadhar_back", aadharBack);
        if (panPic) formData.append("pan_pic", panPic);

        await axiosInstance.post(`/leads/${currentLead.id}/upload-documents`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Documents uploaded successfully!");
      }

      toast.success("Lead updated successfully!");
      setError(null);
    } catch (err) {
      setError(err);
      toast.error("Error updating lead");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCalled = async () => {
    try {
      await apiCall(
        "PUT",
        `/leads/navigation/mark-called/${currentLead.assignment_id}`
      );
      await fetchCurrentLead();
      setIsOpenSource(false);
    } catch (err) {
      setError(err);
    }
  };

  const handleCompleteAssignment = async () => {
    try {
      await apiCall(
        "DELETE",
        `/leads/assignments/${currentLead.assignment_id}`
      );
      await fetchData();
      await fetchCurrentLead();
      setIsOpenResponse(false);
    } catch (err) {
      setError(err);
    }
  };

  const handleCancelEdit = () => {
    setEditFormData(currentLead);
    setIsEditMode(false);
  };

  useEffect(() => {
    fetchCurrentLead();
    fetchData();
    fetchComments();
    fetchRecordings(); // ✅ Fetch recordings on load
  }, []);

  const handleUploadRecording = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File must be under 3MB");
      return;
    }

    const formData = new FormData();
    formData.append("lead_id", id);
    formData.append("employee_code", ""); // If you have employee code, add here
    formData.append("file", file);

    try {
      setUploadingRecording(true);
      await axiosInstance.post(`/recordings/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Recording uploaded successfully!");
      fetchRecordings(); // Refresh list
    } catch (err) {
      console.error("Error uploading recording:", err);
      toast.error("Failed to upload recording");
    } finally {
      setUploadingRecording(false);
    }
  };

  let parsedSegment = [];
  if (currentLead?.segment) {
    try {
      parsedSegment = JSON.parse(currentLead.segment);
    } catch {
      parsedSegment = [currentLead.segment]; // fallback
    }
  }
  const displaySegment = parsedSegment.join(", ");

  // Loading State
  if (loading && !currentLead) {
    return <LoadingState />;
  }

  // Error State
  if (error && !currentLead) {
    return <ErrorState error={error} onRetry={fetchCurrentLead} />;
  }

  // Fetch role from localStorage or cookies
  const userInfo = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user_info")) : null;
  const userRole = userInfo?.role || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}

        <LeadHeader
          uncalledCount={uncalledCount}
          currentLead={currentLead}
          onStoryClick={() => {
            fetchStories();
            setIsStoryModalOpen(true);
          }}
        />

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p>{typeof error === "string" ? error : error?.message || JSON.stringify(error)}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <ActionButtons
          currentLead={currentLead}
          isEditMode={isEditMode}
          loading={loading}
          onCallClick={() => setIsOpenSource(true)}
          onEditClick={() => isEditMode ? handleCancelEdit() : setIsEditMode(true)}
          onSaveClick={handleUpdateLead}
          onKycClick={fetchKycUserDetails}
          kycLoading={kycLoading}
          onPaymentClick={() => setIsOpenPayment(true)}
          onSendEmailClick={() => setIsEmailModalOpen(true)}
          onViewEmailLogsClick={fetchEmailLogs}
          onCommentsClick={() => setIsCommentsModalOpen(true)}
          onRecordingsClick={() => setIsRecordingsModalOpen(true)}
          onViewKycClick={handleViewKyc}
          onDocumentsClick={() => setIsDocumentsModalOpen(true)}
        />

        {/* Lead Details */}
        <ViewAndEditLead
          currentLead={currentLead}
          editFormData={editFormData}
          setEditFormData={setEditFormData}
          isEditMode={isEditMode}
          leadSources={leadSources}
          leadResponses={leadResponses}
          handleFileChange={handleFileChange}
          aadharFrontPreview={aadharFrontPreview}
          aadharBackPreview={aadharBackPreview}
          panPicPreview={panPicPreview}
          setAadharFront={setAadharFront}
          setAadharBack={setAadharBack}
          setPanPic={setPanPic}
          setAadharFrontPreview={setAadharFrontPreview}
          setAadharBackPreview={setAadharBackPreview}
          setPanPicPreview={setPanPicPreview}
        />

        {/* Modals */}
        {/* Upload Documents Modal */}
        <Modal
          isOpen={isDocumentsModalOpen}
          onClose={() => setIsDocumentsModalOpen(false)}
          title="Upload Lead Documents"
          actions={[
            <button
              key="close"
              onClick={() => setIsDocumentsModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>,
            <button
              key="upload"
              onClick={async () => {
                if (!aadharFront && !aadharBack && !panPic) {
                  toast.error("Please select at least one file to upload.");
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
                  setIsDocumentsModalOpen(false);
                  // Optionally: refresh lead data to show updated docs
                  fetchCurrentLead();
                } catch (err) {
                  toast.error("Error uploading documents");
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
                onChange={e => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
                className="w-full border rounded p-2"
              />
              {aadharFrontPreview ? (
                <img
                  src={aadharFrontPreview}
                  alt="Aadhaar Front Preview"
                  className="mt-2 w-32 h-24 object-cover border rounded"
                />
              ) : currentLead?.aadhar_front_pic ? (
                <a
                  href={getFileUrl(currentLead.aadhar_front_pic)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={getFileUrl(currentLead.aadhar_front_pic)}
                    alt="Aadhaar Front"
                    className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition"
                  />
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
                onChange={e => handleFileChange(e, setAadharBack, setAadharBackPreview)}
                className="w-full border rounded p-2"
              />
              {aadharBackPreview ? (
                <img
                  src={aadharBackPreview}
                  alt="Aadhaar Back Preview"
                  className="mt-2 w-32 h-24 object-cover border rounded"
                />
              ) : currentLead?.aadhar_back_pic ? (
                <a
                  href={getFileUrl(currentLead.aadhar_back_pic)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={getFileUrl(currentLead.aadhar_back_pic)}
                    alt="Aadhaar Back"
                    className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition"
                  />
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
                onChange={e => handleFileChange(e, setPanPic, setPanPicPreview)}
                className="w-full border rounded p-2"
              />
              {panPicPreview ? (
                <img
                  src={panPicPreview}
                  alt="PAN Card Preview"
                  className="mt-2 w-32 h-24 object-cover border rounded"
                />
              ) : currentLead?.pan_pic ? (
                <a
                  href={getFileUrl(currentLead.pan_pic)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={getFileUrl(currentLead.pan_pic)}
                    alt="PAN Card"
                    className="mt-2 w-32 h-24 object-cover border rounded hover:shadow-lg transition"
                  />
                </a>
              ) : (
                <p className="text-gray-400 text-xs">Not uploaded</p>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isOpenSource}
          onClose={() => setIsOpenSource(false)}
          title="Mark Lead as Called"
          actions={[
            <button
              key="cancel"
              onClick={() => setIsOpenSource(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>,
            <button
              key="confirm"
              onClick={handleMarkAsCalled}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Mark as Called
            </button>,
          ]}
        >
          <p className="text-gray-600">
            Are you sure you want to mark this lead as called? This action
            cannot be undone.
          </p>
        </Modal>
        <Modal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          title=""
          actions={[]} // Remove footer buttons
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col z-50">
            {/* Header */}
            <div className="flex justify-between items-center bg-white shadow px-4 py-2">
              <h3 className="text-lg font-semibold text-gray-900">KYC Document</h3>
              <div className="flex gap-2">
                {userRole === "SUPERADMIN" && (
                  <a
                    href={kycUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Download
                  </a>
                )}
                <button
                  onClick={() => setIsKycModalOpen(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Horizontal Layout */}
            <div className="flex h-[600px]">
              {/* PDF Section */}
              {kycUrl ? (
                <iframe
                  src={kycUrl}
                  title="KYC PDF"
                  width="100%"
                  height="100%"
                  className="rounded shadow border min-h-[500px]"
                />
              ) : (
                <p className="text-center text-gray-500 mt-20">Loading PDF...</p>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isOpenResponse}
          onClose={() => setIsOpenResponse(false)}
          title="Complete Assignment"
          actions={[
            <button
              key="cancel"
              onClick={() => setIsOpenResponse(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>,
            <button
              key="confirm"
              onClick={handleCompleteAssignment}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Complete Assignment
            </button>,
          ]}
        >
          <p className="text-gray-600">
            Are you sure you want to complete this assignment? This will remove
            it from your active assignments.
          </p>
        </Modal>
        {/* Comments Modal */}
        <Modal
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          title="Lead Comments"
        >
          {loadingComments ? (
            <p className="text-gray-500">Loading comments...</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments?.length > 0 && Array.isArray(comments) && comments?.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg ${c.user_id === "You" ? "bg-blue-100" : "bg-gray-100"}`}
                >
                  <p className="text-sm">{c.comment}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(c.timestamp).toLocaleString()} • {c.user_id}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex mt-4 gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleAddComment}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Add
            </button>
          </div>
        </Modal>

        {/* Recordings Modal */}
        <Modal
          isOpen={isRecordingsModalOpen}
          onClose={() => setIsRecordingsModalOpen(false)}
          title="Call Recordings"
          actions={[
            <button
              key="close"
              onClick={() => setIsRecordingsModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>,
          ]}
        >
          {loadingRecordings ? (
            <p className="text-gray-500">Loading recordings...</p>
          ) : recordings.length === 0 ? (
            <p className="text-gray-500">No recordings found.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Array.isArray(recordings) && recordings?.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <audio controls className="w-3/4">
                    <source
                      src={`${axiosInstance.defaults.baseURL.replace("/api/v1", "")}/${rec.recording_url.replace("\\", "/")}`}
                      type="audio/mpeg"
                    />
                  </audio>
                  <span className="text-xs text-gray-500">
                    {new Date(rec.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upload */}
          {hasPermission("lead_recording_upload") && <div className="mt-4">
            <input
              type="file"
              accept="audio/*"
              onChange={handleUploadRecording}
              disabled={uploadingRecording}
              className="w-full border rounded p-2"
            />
            {uploadingRecording && <p className="text-blue-500 mt-2 text-sm">Uploading...</p>}
          </div>}
        </Modal>
      </div>

      <PaymentModel
        open={isOpenPayment}
        setOpen={setIsOpenPayment}
        name={currentLead?.full_name}
        phone={currentLead?.mobile}
        email={currentLead?.email}
        service={displaySegment}
        lead_id={currentLead?.id}
      />

      <Modal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        title="Lead Story"
        actions={[
          <button
            key="close"
            onClick={() => setIsStoryModalOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>,
        ]}
      >
        {loadingStories ? (
          <p className="text-gray-600">Loading stories...</p>
        ) : stories.length === 0 ? (
          <p className="text-gray-600">No story available for this lead.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stories.map((story) => (
              <div key={story.id} className="border-b pb-2">
                <p className="text-sm text-gray-800">{story.msg}</p>
                <p className="text-xs text-gray-500">
                  {new Date(story.timestamp).toLocaleString()} by {story.user_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setContextFields([]);
          setEmailContext({});
        }}
        title="Send Email"
        actions={[
          <button
            key="cancel"
            onClick={() => setIsEmailModalOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>,
          <button
            key="send"
            onClick={handleSendEmail}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Send
          </button>,
        ]}
      >
        <div className="space-y-4">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Select Email Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const templateId = Number(e.target.value);
                setSelectedTemplateId(templateId);
                const selectedTemplate = templates.find((t) => t.id === templateId);
                if (selectedTemplate) {
                  const combinedText =
                    `${selectedTemplate.subject || ""} ${selectedTemplate.body || ""}`;
                  // dedupe any repeated placeholders
                  const placeholders = Array.from(
                    new Set(extractPlaceholders(combinedText))
                  );
                  setContextFields(placeholders);
                  setEmailContext({});
                }
              }}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">-- Select Template --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.subject.replace(/{{.*?}}/g, '').trim()})
                </option>
              ))}
            </select>
          </div>

          {/* Context */}
          {contextFields.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Fill Template Data</h4>
              {contextFields.map((field) => (
                <div key={field} className="mb-3">
                  <label className="block text-xs font-medium mb-1 capitalize">{field}</label>
                  <input
                    type="text"
                    value={emailContext[field] || ""}
                    onChange={(e) =>
                      setEmailContext((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </Modal>

      <Modal
        isOpen={isEmailLogsModalOpen}
        onClose={() => setIsEmailLogsModalOpen(false)}
        title="Email Logs"
        actions={[
          <button
            key="close"
            onClick={() => setIsEmailLogsModalOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>,
        ]}
      >
        {emailLogs.length === 0 ? (
          <p className="text-gray-600">No logs available for this recipient.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {emailLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                onClick={async () => {
                  const { data } = await axiosInstance.get(`/email/logs/${log.id}`);
                  toast.info(`Subject: ${data.subject}\nSent: ${data.sent_at}`);
                }}
              >
                <p className="text-sm font-medium text-gray-800">{log.subject}</p>
                <p className="text-xs text-gray-500">
                  Sent at: {new Date(log.sent_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Lead;

// InputField Component
// ==============================================

export const InputField = ({
  label,
  name,
  value,
  type = "text",
  icon: Icon,
  options = [],
  placeholder,
  rows = 3,
  isEditMode,
  onInputChange,
}) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700">
      {Icon && <Icon size={16} className="mr-2 text-gray-500" />}
      {label}
    </label>
    {isEditMode ? (
      type === "select" ? (
        <select
          name={name}
          value={value || ""}
          onChange={onInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value || ""}
          onChange={onInputChange}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
        />
      ) : type === "checkbox" ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={value || false}
            onChange={onInputChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="ml-2 text-sm text-gray-700">{label}</span>
        </div>
      ) : (
        <input
          type={type}
          name={name}
          value={
            type === "date"
              ? value
                ? new Date(value).toISOString().split("T")[0]
                : ""
              : type === "datetime-local"
                ? value
                  ? new Date(value).toISOString().slice(0, 16)
                  : ""
                : value || ""
          }
          onChange={onInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      )
    ) : (
      <div className="px-3 py-2 bg-gray-50 rounded-lg min-h-[38px] flex items-center">
        {type === "checkbox" ? (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${value
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
              }`}
          >
            {value ? (
              <CheckCircle size={12} className="mr-1" />
            ) : (
              <XCircle size={12} className="mr-1" />
            )}
            {value ? "Yes" : "No"}
          </span>
        ) : type === "date" ? (
          <span className="text-gray-900">
            {value ? new Date(value).toLocaleDateString() : "Not set"}
          </span>
        ) : type === "datetime-local" ? (
          <span className="text-gray-900">
            {value ? new Date(value).toLocaleString() : "Not set"}
          </span>
        ) : type === "select" ? (
          <span className="text-gray-900">
            {options.find((opt) => opt.value === value)?.label ||
              "Not selected"}
          </span>
        ) : (
          <span className="text-gray-900 break-words">
            {name === "gstin"
              ? (!value || value.trim().toUpperCase() === "NOT PROVIDED" ? "URP" : value)
              : Array.isArray(value)
                ? value.join(", ")
                : typeof value === 'object' && value !== null
                  ? value.text || JSON.stringify(value)
                  : value || "NOT PROVIDED"
            }
          </span>
        )}
      </div>
    )}
  </div>
);


// ErrorAlert Component
export const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        <p className="text-sm text-red-800">{error?.message || String(error)}</p>
        <button
          onClick={onClose}
          className="ml-auto text-red-400 hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// LeadActionButton Component
export const LeadActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  variant = "primary",
  loading = false
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case "success":
        return "bg-green-500 hover:bg-green-600";
      case "danger":
        return "bg-red-500 hover:bg-red-600";
      case "warning":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "secondary":
        return "bg-gray-500 hover:bg-gray-600";
      case "purple":
        return "bg-purple-500 hover:bg-purple-600";
      case "indigo":
        return "bg-indigo-500 hover:bg-indigo-600";
      default:
        return "bg-blue-500 hover:bg-blue-600";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle()}`}
    >
      <Icon size={16} className="mr-2" />
      {loading ? "Loading..." : label}
    </button>
  );
};

// FormSection Component
export const FormSection = ({ title, icon: Icon, children, iconColor = "text-blue-500" }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Icon className={`mr-2 ${iconColor}`} size={20} />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {children}
      </div>
    </div>
  );
};

// ==============================================
// StatusBadge Component
// ==============================================

export const StatusBadge = ({ status, type = "default" }) => {
  const getStatusColor = () => {
    switch (type) {
      case "call":
        return status
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800";
      case "kyc":
        return status
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-800";
      case "old":
        return status
          ? "bg-orange-100 text-orange-800"
          : "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = () => {
    switch (type) {
      case "call":
        return status ? "Called" : "Not Called";
      case "kyc":
        return status ? "KYC Completed" : "KYC Pending";
      case "old":
        return status ? "Old Lead" : "New Lead";
      default:
        return status ? "Active" : "Inactive";
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case "call":
        return status ? <CheckCircle size={12} /> : <AlertCircle size={12} />;
      case "kyc":
        return status ? <CheckCircle size={12} /> : <XCircle size={12} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
    >
      {getStatusIcon()}
      <span className="ml-1">{getStatusText()}</span>
    </span>
  );
};

// ==============================================
// Modal Component
// ==============================================

export const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-6">{children}</div>
        <div className="flex gap-2 justify-end">{actions}</div>
      </div>
    </div>
  );
};


// ==============================================
// ErrorState Component
// ==============================================

export const ErrorState = ({ error, onRetry }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Lead
        </h3>
        <p className="text-gray-600 mb-4">
  {typeof error === "string"
    ? error
    : error?.message
    ? error.message
    : JSON.stringify(error)}
</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// ==============================================
// LeadHeader Component
// ==============================================


export const LeadHeader = ({ navigationInfo, uncalledCount, currentLead, onStoryClick }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-800">
        Lead Details {currentLead?.id ? `- ID #${currentLead.id}` : ""}
      </h3>
      <div className="sm:mt-0 flex items-center space-x-4">
        <StatusBadge status={currentLead?.is_call} type="call" />
        <StatusBadge status={currentLead?.kyc} type="kyc" />
        <StatusBadge status={currentLead?.is_old_lead} type="old" />
        <button
          onClick={onStoryClick}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm"
        >
          View Story
        </button>
      </div>
    </div>
  );
};

// ==============================================
// ActionButtons Component
// ==============================================

export const ActionButtons = ({
  currentLead,
  isEditMode,
  loading,
  onCallClick,
  onEditClick,
  onSaveClick,
  onKycClick,
  kycLoading = false,
  onPaymentClick,
  onSendEmailClick,
  onViewEmailLogsClick,
  onCommentsClick,
  onRecordingsClick,
  onViewKycClick,
  onDocumentsClick,
}) => {

  const { hasPermission } = usePermissions();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-wrap gap-3">
        {/* Existing Buttons */}
        <button
          onClick={onCallClick}
          disabled={!currentLead || currentLead?.is_call}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${currentLead?.is_call
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
            }`}
        >
          <PhoneCall size={16} className="mr-2" />
          {currentLead?.is_call ? "Called" : "Call"}
        </button>

        <button
          onClick={onEditClick}
          disabled={!currentLead}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isEditMode
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-indigo-500 text-white hover:bg-indigo-600"
            }`}
        >
          {isEditMode ? (
            <X size={16} className="mr-2" />
          ) : (
            <Edit3 size={16} className="mr-2" />
          )}
          {isEditMode ? "Cancel" : "Edit"}
        </button>

        {isEditMode && (
          <button
            onClick={onSaveClick}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} className="mr-2" />
            {loading ? "Saving..." : "Save"}
          </button>
        )}

        {/* ✅ Show KYC Button Only if KYC Completed */}
        {currentLead?.kyc && (
          <button
            onClick={onViewKycClick}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Eye size={16} className="mr-2" />
            View KYC
          </button>
        )}

        {!currentLead?.kyc ? (
          <button
            onClick={onKycClick}
            disabled={kycLoading || !currentLead?.email}
            className={`flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            {kycLoading && (
              <svg
                className="animate-spin h-4 w-4 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
            )}
            KYC
          </button>
        ) : null}

        <button
          onClick={onPaymentClick}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Payment
        </button>
        <button
          onClick={onSendEmailClick}
          className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Send Email
        </button>

        <button
          onClick={onViewEmailLogsClick}
          className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          View Email Logs
        </button>

        <button
          onClick={onCommentsClick}
          className="flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
        >
          Comments
        </button>

        {hasPermission("lead_recording_view") && <button
          onClick={onRecordingsClick}
          className="flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          Recordings
        </button>}

        <button
          onClick={onDocumentsClick}
          className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <FileText size={16} className="mr-2" />
          Documents
        </button>
      </div>
    </div>
  );
};

// ==============================================
// ViewAndEditLead Component
// ==============================================

export const ViewAndEditLead = ({
  currentLead,
  editFormData,
  setEditFormData,
  isEditMode,
  leadSources,
  leadResponses,
  handleFileChange,
  aadharFrontPreview,
  aadharBackPreview,
  panPicPreview,
  setAadharFront,
  setAadharBack,
  setPanPic,
  setAadharFrontPreview,
  setAadharBackPreview,
  setPanPicPreview
}) => {
  // PAN verification states
  const [panLoading, setPanLoading] = useState(false);
  const [panError, setPanError] = useState(null);
  const [panVerifiedData, setPanVerifiedData] = useState(null);

  // PAN verification function
  // Helper: Format date to YYYY-MM-DD
  function formatDob(dob) {
    if (!dob) return "";
    // If already in YYYY-MM-DD just return
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
    // Try DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
      const [d, m, y] = dob.split("-");
      return `${y}-${m}-${d}`;
    }
    return dob;
  }

  // PAN verification function (micro-pan-verification)
  const verifyPan = async (pan) => {
    try {
      const res = await axiosInstance.post(
        '/micro-pan-verification',
        new URLSearchParams({ pannumber: pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return res.data;
    } catch (error) {
      throw error?.response?.data?.detail || error?.message || "PAN verification failed";
    }
  };

  // On any input change
  const handleInputChange = useCallback(async (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // PAN verify logic
    if (name === "pan") {
      setPanVerifiedData(null);
      setPanError(null);

      // Only check when 10 chars and not blank
      if (value && value.length === 10) {
        setPanLoading(true);
        try {
          const data = await verifyPan(value.toUpperCase());
          if (data.success && data.data?.result) {
            const result = data.data.result;

            // Autofill all fields from PAN API (except phone & email)
            setEditFormData((prev) => ({
              ...prev,
              full_name: result.user_full_name || prev.full_name,
              father_name: result.user_father_name || prev.father_name,
              dob: result.user_dob ? formatDob(result.user_dob) : prev.dob,
              address: result.user_address?.full || prev.address,
              city: result.user_address?.city || prev.city,
              state: result.user_address?.state || prev.state,
              pincode: result.user_address?.zip || prev.pincode,
              country: result.user_address?.country || prev.country,
              aadhaar: result.masked_aadhaar || prev.aadhaar,
              gender: result.user_gender === "M" ? "Male" : result.user_gender === "F" ? "Female" : prev.gender,
              // Optionally, add more fields if you have them in your form:
              // district: result.user_address?.district || prev.district,
              // director_name: result.director_name || prev.director_name,
            }));
            setPanVerifiedData(result);
            toast.success("PAN verified and details autofilled!");
          } else {
            setPanError("PAN verification failed");
            toast.error("PAN verification failed");
          }
        } catch (err) {
          setPanError(err);
          toast.error(typeof err === "string" ? err : "Error verifying PAN");
        } finally {
          setPanLoading(false);
        }
      }
    }
  }, [setEditFormData]);

  // Field definitions
  const personalFields = [
    { name: "pan", label: "PAN Number", icon: CreditCard, placeholder: "Enter PAN number" },
    { name: "aadhaar", label: "Aadhaar Number", icon: CreditCard, placeholder: "Enter Aadhaar number" },
    { name: "full_name", label: "Full Name", icon: User, placeholder: "Enter full name" },
    { name: "father_name", label: "Father Name", icon: User, placeholder: "Enter father name" },
    { name: "mobile", label: "Mobile", icon: Phone, type: "tel", placeholder: "Enter mobile number" },
    { name: "email", label: "Email", icon: Mail, type: "email", placeholder: "Enter email address" },
    { name: "director_name", label: "Director Name", icon: User, placeholder: "Enter director name" },
    {
      name: "gender", label: "Gender", icon: User, type: "select",
      options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]
    },
    {
      name: "marital_status", label: "Marital Status", icon: User, type: "select",
      options: [
        { value: "Single", label: "Single" },
        { value: "Married", label: "Married" },
        { value: "Divorced", label: "Divorced" },
        { value: "Widowed", label: "Widowed" },
      ]
    },
    { name: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
    { name: "age", label: "Age", icon: Calendar, type: "number", readonly: true },
  ];

  const contactFields = [
    { name: "alternate_mobile", label: "Alternate Mobile", icon: Phone, type: "tel", placeholder: "Enter alternate mobile" },
    { name: "address", label: "Address", icon: MapPin, type: "textarea", placeholder: "Enter full address" },
    { name: "city", label: "City", icon: MapPin, placeholder: "Enter city" },
    { name: "state", label: "State", icon: MapPin, placeholder: "Enter state" },
    { name: "district", label: "District", icon: MapPin, placeholder: "Enter district" },
    { name: "pincode", label: "Pincode", icon: MapPin, placeholder: "Enter pincode" },
    { name: "country", label: "Country", icon: Globe, placeholder: "Enter country" },
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
      ]
    },
    { name: "segment", label: "Segment", icon: Briefcase, placeholder: "Enter segment (comma-separated if multiple)" },
    { name: "gstin", label: "GSTIN", icon: Building, placeholder: "Enter GSTIN" },
    { name: "lead_source_id", label: "Lead Source", icon: Building, type: "select", options: leadSources },
    { name: "lead_response_id", label: "Lead Response", icon: Building, type: "select", options: leadResponses },
    { name: "call_back_date", label: "Callback Date", icon: Calendar, type: "datetime-local" },
  ];

  if (!currentLead) return null;

  return (
    <div className="flex flex-col gap-6 mb-6">

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <User className="mr-2 text-blue-500" size={20} />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {personalFields.map((field) => {
            if (field.name === "dob") {
              return (
                <InputField
                  key={field.name}
                  {...field}
                  value={editFormData[field.name]}
                  isEditMode={isEditMode}
                  onInputChange={handleInputChange}
                  // Show as dd-mm-yyyy in view, as date input in edit
                  renderValue={(value) => formatDDMMYYYY(value)}
                />
              );
            }
            if (field.name === "age") {
              // Age is always readonly, not editable
              return (
                <InputField
                  key={field.name}
                  {...field}
                  value={calculateAge(editFormData.dob)}
                  isEditMode={false}
                  icon={Calendar}
                />
              );
            }
            if (field.name === "pan") {
              return (
                <div key={field.name} className="relative">
                  <InputField
                    {...field}
                    value={editFormData[field.name]}
                    isEditMode={isEditMode}
                    onInputChange={handleInputChange}
                  />
                  {isEditMode && (
                    <div className="mt-1">
                      {panLoading && (
                        <span className="text-xs text-blue-500">Verifying PAN...</span>
                      )}
                      {panError && (
                        <span className="text-xs text-red-500">{panError}</span>
                      )}
                      {panVerifiedData && (
                        <span className="text-xs text-green-600">
                          PAN Verified: {panVerifiedData?.name || "Success"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <InputField
                key={field.name}
                {...field}
                value={editFormData[field.name]}
                isEditMode={isEditMode}
                onInputChange={handleInputChange}
              />
            );
          })}
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Phone className="mr-2 text-green-500" size={20} />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {contactFields.map((field) => (
            <InputField
              key={field.name}
              {...field}
              value={editFormData[field.name]}
              isEditMode={isEditMode}
              onInputChange={handleInputChange}
            />
          ))}
        </div>
      </div>

      {/* Professional & Documentation */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Briefcase className="mr-2 text-purple-500" size={20} />
          Professional & Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {professionalFields.map((field) =>
            field.name === "pan" ? (
              <div key={field.name} className="relative">
                <InputField
                  {...field}
                  value={editFormData[field.name]}
                  isEditMode={isEditMode}
                  onInputChange={handleInputChange}
                />
                {isEditMode && (
                  <div className="mt-1">
                    {panLoading && (
                      <span className="text-xs text-blue-500">Verifying PAN...</span>
                    )}
                    {panError && (
                      <span className="text-xs text-red-500">{panError}</span>
                    )}
                    {panVerifiedData && (
                      <span className="text-xs text-green-600">
                        PAN Verified: {panVerifiedData?.name || "Success"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <InputField
                key={field.name}
                {...field}
                value={editFormData[field.name]}
                isEditMode={isEditMode}
                onInputChange={handleInputChange}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ==============================================