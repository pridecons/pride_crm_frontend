// Main Lead Component
"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  IndianRupee,
  Building,
  Globe,
  MessageCircle,
  Mic,
  BookOpenText,
} from "lucide-react";
import PaymentModel from "@/components/Fetch_Lead/PaymentModel";
import toast from "react-hot-toast";
// import { Viewer, Worker } from "@react-pdf-viewer/core";
// import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
// import "@react-pdf-viewer/core/lib/styles/index.css";
// import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import LoadingState, { MiniLoader } from "@/components/LoadingState";
import { usePermissions } from "@/context/PermissionsContext";
import { Modal } from "@/components/Lead/ID/Modal";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import EmailModalWithLogs from "@/components/Lead/EmailModalWithTabs";
import InvoiceList from "@/components/Lead/InvoiceList";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
import { useFTAndCallbackPatch } from "@/components/Lead/useFTAndCallbackPatch";
import { ActionButtons } from "@/components/Lead/ID/ActionButtons";
import { ViewAndEditLead } from "@/components/Lead/ID/ViewAndEditLead";
import SMSModalWithLogs from "@/components/Lead/ID/SMSModalWithLogs";
import LeadShareModal from "@/components/Lead/ID/LeadShareModal";

// --- After all your imports, add this function ---
export const getFileUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.startsWith("/") ? path : `/static/lead_documents/${path}`;
  const baseURL = axiosInstance.defaults.baseURL.replace("/api/v1", "");
  return `${baseURL}${cleanPath}`;
};

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
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
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
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const responseListForHook = leadResponses.map(r => ({
    id: r.value,
    name: r.label,
  }));

  const {
    showFTModal,
    setShowFTModal,
    ftLead,

    ftFromDate,
    setFTFromDate,
    ftToDate,
    setFTToDate,
    showCallBackModal,
    setShowCallBackModal,

    callBackLead,
    callBackDate,
    setCallBackDate,
    handleResponseChange, saveFT, saveCallBack, cancelFT, cancelCallBack,
  } = useFTAndCallbackPatch({
    responses: responseListForHook,
    onPatched: fetchCurrentLead,
  });

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
      // Figure out which response name is selected
      const respName = getResponseNameById(updateData.lead_response_id);

      if (updateData.dob) {
        updateData.dob = new Date(updateData.dob).toISOString().split("T")[0];
      }
      // Enforce dates for FT / Call Back, convert formats
      if (respName === "ft") {
        if (!updateData.ft_from_date || !updateData.ft_to_date) {
          toast.error("Please set both FT From and FT To dates before saving.");
          setLoading(false);
          return;
        }
        // inputs are YYYY-MM-DD; API expects DD-MM-YYYY
        updateData.ft_from_date = ymdToDmy(updateData.ft_from_date);
        updateData.ft_to_date = ymdToDmy(updateData.ft_to_date);
      }

      if (respName === "call back" || respName === "callback") {
        if (!updateData.call_back_date) {
          toast.error("Please set a Call Back date & time before saving.");
          setLoading(false);
          return;
        }
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

  // Get response name by id (lowercased for comparisons)
  const getResponseNameById = (id) => {
    const match = leadResponses.find((r) => r.value === id || r.id === id);
    return match?.label?.toLowerCase?.() ?? match?.name?.toLowerCase?.() ?? "";
  };

  // DMY -> YMD
  const dmyToYmd = (dmy) => {
    if (!dmy) return "";
    const [dd, mm, yyyy] = dmy.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  const ymdToDmy = (ymd) => {
    if (!ymd) return "";
    const [yyyy, mm, dd] = ymd.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  // Format ISO datetime to "YYYY-MM-DDTHH:MM" for <input type="datetime-local">
  const isoToDatetimeLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mmn = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${hh}:${mmn}`;
  };

  // Open FT modal prefilled from currentLead values
  const handleEditFTInline = () => {

    // API stores DMY; convert to input YMD
    const ymdFrom = currentLead?.ft_from_date ? dmyToYmd(currentLead.ft_from_date) : "";
    const ymdTo = currentLead?.ft_to_date ? dmyToYmd(currentLead.ft_to_date) : "";
    setFTFromDate(ymdFrom);
    setFTToDate(ymdTo);
    setShowFTModal(true);
  };

  // Open Call Back modal prefilled from currentLead call_back_date (ISO)
  const handleEditCallbackInline = () => {

    setCallBackDate(isoToDatetimeLocal(currentLead?.call_back_date || ""));
    setShowCallBackModal(true);
  };

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
        />

        {/* Response-specific info block */}
        {currentLead?.lead_response_id && (() => {
          const respName = getResponseNameById(currentLead.lead_response_id);

          if (respName === "ft") {
            return (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm flex items-center justify-between">
                <div className="text-blue-900">
                  <div className="font-semibold">Follow-Through (FT)</div>
                  <div className="mt-1">
                    <span className="font-medium">From:</span>{" "}
                    {currentLead?.ft_from_date || "N/A"}{" "}
                    <span className="font-medium ml-3">To:</span>{" "}
                    {currentLead?.ft_to_date || "N/A"}
                  </div>
                </div>
                <button
                  onClick={handleEditFTInline}
                  className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Edit FT Dates
                </button>
              </div>
            );
          }

          if (respName === "call back" || respName === "callback") {
            return (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm flex items-center justify-between">
                <div className="text-amber-900">
                  <div className="font-semibold">Call Back</div>
                  <div className="mt-1">
                    <span className="font-medium">Call Back Date:</span>{" "}
                    {currentLead?.call_back_date
                      ? new Date(currentLead.call_back_date).toLocaleString()
                      : "N/A"}
                  </div>
                </div>
                <button
                  onClick={handleEditCallbackInline}
                  className="px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700"
                >
                  Edit Call Back
                </button>
              </div>
            );
          }

          return null;
        })()}

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
          loading={loading}
          onCallClick={() => setIsOpenSource(true)}
          onKycClick={fetchKycUserDetails}
          kycLoading={kycLoading}
          onPaymentClick={() => setIsOpenPayment(true)}
          onSendEmailClick={() => setIsEmailModalOpen(true)}
          onSendSMSClick={() => setIsSMSModalOpen(true)}
          onViewEmailLogsClick={fetchEmailLogs}
          onCommentsClick={() => setIsCommentsModalOpen(true)}
          onRecordingsClick={() => setIsRecordingsModalOpen(true)}
          onViewKycClick={handleViewKyc}
          onDocumentsClick={() => setIsDocumentsModalOpen(true)}
          onStoryClick={() => {
            fetchStories();
            setIsStoryModalOpen(true);
          }}
          onInvoiceClick={() => setIsInvoiceModalOpen(true)}
          onShareClick={() => setIsShareModalOpen(true)}
        />

        {/* Right-aligned Edit / Back button */}
        <div className="flex justify-end mt-2 mb-4">
          <button
            onClick={() => (isEditMode ? handleCancelEdit() : setIsEditMode(true))}
            disabled={!currentLead}
            aria-pressed={isEditMode}
            className={`group relative inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm font-medium
      shadow-sm transition-all
      ${isEditMode
                ? "border-red-300 text-red-700 bg-white hover:bg-red-50 hover:border-red-400 focus:ring-2 focus:ring-red-200"
                : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 focus:ring-2 focus:ring-slate-200"
              }
      disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isEditMode ? "bg-red-500" : "bg-indigo-500"}`}
              aria-hidden="true"
            />
            {isEditMode ? "Back" : "Edit"}
            {isEditMode ? <X size={16} className="opacity-80 group-hover:opacity-100" /> : <Edit3 size={16} className="opacity-80 group-hover:opacity-100" />}
          </button>
        </div>

        <SMSModalWithLogs
          open={isSMSModalOpen}
          onClose={() => setIsSMSModalOpen(false)}
          leadMobile={currentLead?.mobile}
          leadName={currentLead?.full_name}
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
          handleLeadResponseChange={handleResponseChange}
          fetchCurrentLead={fetchCurrentLead}
        />

        {/* —————— SAVE AT BOTTOM —————— */}
        {isEditMode && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpdateLead}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} className="mr-2" />
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        )}

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
        <CommentModal
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          leadId={currentLead?.id}
        />

        <InvoiceList
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          leadId={currentLead?.id}
        />

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

        <LeadShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          leadId={currentLead?.id}
          onSuccess={(data) => {
            // Optionally refresh lead or log
            fetchCurrentLead();
            console.log("Lead shared:", data);
          }}
        />

        <FTModal
          open={showFTModal}
          onClose={() => {
            const prev = cancelFT();
            if (prev != null) {
              setEditFormData((p) => ({ ...p, lead_response_id: prev }));
            }
          }}
          onSave={async (payload) => {
            try {
              // get the FT response id (works whether items are {id,name} or {value,label})
              const ftResp =
                leadResponses.find(
                  (r) => (r.label || r.name || "").toLowerCase() === "ft"
                );
              const ftResponseId = ftResp?.value ?? ftResp?.id;
              if (!ftResponseId) throw new Error("FT response not found");

              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: ftResponseId,
                ft_from_date: payload.ft_from_date,     // already D-M-Y from FTModal
                ft_to_date: payload.ft_to_date,         // already D-M-Y from FTModal
                segment: payload.segment,               // e.g., "cash", "index_option", …
                ft_service_type: payload.ft_service_type, // "call" | "sms"
              });
              toast.success("FT dates updated");
              setShowFTModal(false);
              fetchCurrentLead();
            } catch (e) {
              toast.error(e?.message || "Failed to save FT");
            }
          }}
          fromDate={ftFromDate}
          toDate={ftToDate}
          setFromDate={setFTFromDate}
          setToDate={setFTToDate}
        />
        <CallBackModal
          open={showCallBackModal}
          onClose={() => {
            const prev = cancelCallBack();
            if (prev != null) {
              setEditFormData((p) => ({ ...p, lead_response_id: prev }));
            }
          }}
          onSave={async () => {
            try {
              if (!callBackDate) throw new Error("Call back date is required");
              const cbResp = leadResponses.find((r) => {
                const n = (r.label || r.name || "").toLowerCase();
                return n === "call back" || n === "callback";
              });
              const cbResponseId = cbResp?.value ?? cbResp?.id;
              if (!cbResponseId) throw new Error("Callback response not found");

              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: cbResponseId,
                call_back_date: new Date(callBackDate).toISOString(),
              });
              toast.success("Call back updated");
              setShowCallBackModal(false);
              fetchCurrentLead();
            } catch (e) {
              toast.error(e?.message || "Failed to save Call Back");
            }
          }}
          dateValue={callBackDate}
          setDateValue={setCallBackDate}
        />


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

      <StoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        leadId={currentLead?.id}
      />
      <EmailModalWithLogs
        open={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        leadEmail={currentLead?.email}
        leadName={currentLead?.full_name}
      />

    </div>
  );
};

export default Lead;

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
          ? "bg-green-100 text-green-800"
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
      case "client":
        return "Client";
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


export const LeadHeader = ({ navigationInfo, uncalledCount, currentLead }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h3 className="text-2xl font-bold text-gray-800">
        Lead Details {currentLead?.id ? `- ID #${currentLead.id}` : ""}
      </h3>
      <div className="sm:mt-0 flex items-center space-x-4">
        <StatusBadge status={currentLead?.is_call} type="call" />
        <StatusBadge status={currentLead?.kyc} type="kyc" />
        {currentLead?.is_client
          ? <StatusBadge status={true} type="client" />
          : <StatusBadge status={currentLead?.is_old_lead} type="old" />
        }
      </div>
    </div>
  );
};
