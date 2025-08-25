// Main Lead Component
"use client";

import React, { useEffect, useState, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { useParams } from "next/navigation";
import { Edit3, Save, X, AlertCircle, MessageCircle, BookOpenText, Building, UserCheck } from "lucide-react";
import PaymentModel from "@/components/Fetch_Lead/PaymentModel";
import toast from "react-hot-toast";
import LoadingState from "@/components/LoadingState";
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
import RecordingsModal from "@/components/Lead/ID/RecordingsModal";
import KycViewerModal from "@/components/Lead/ID/KycViewerModal";
import ConfirmCalledModal from "@/components/Lead/ID/ConfirmCalledModal";
import DocumentsModal from "@/components/Lead/ID/DocumentsModal";
import LeadHeader from "@/components/Lead/ID/LeadHeader";
import ErrorState from "@/components/ErrorState";
import { usePermissions } from '@/context/PermissionsContext';

const Lead = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const [isOpenPayment, setIsOpenPayment] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpenSource, setIsOpenSource] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const [leadSources, setLeadSources] = useState([]);
  const [leadResponses, setLeadResponses] = useState([]);

  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panPic, setPanPic] = useState(null);

  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [panPicPreview, setPanPicPreview] = useState(null);

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isRecordingsModalOpen, setIsRecordingsModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycUrl, setKycUrl] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [userNameMap, setUserNameMap] = useState({});     // { EMP006: "shivi", ... }
  const [branchNameMap, setBranchNameMap] = useState({}); // { 1: "Main Branch", ... }

  // fetch guard (StrictMode)
  const didInit = useRef(false);

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

  const responseListForHook = leadResponses.map((r) => ({
    id: r.value,
    name: r.label,
  }));

  const {
    showFTModal,
    setShowFTModal,
    ftFromDate,
    setFTFromDate,
    ftToDate,
    setFTToDate,
    showCallBackModal,
    setShowCallBackModal,
    callBackDate,
    setCallBackDate,
    handleResponseChange,
    cancelFT,
    cancelCallBack,
  } = useFTAndCallbackPatch({
    responses: responseListForHook,
    onPatched: fetchCurrentLead,
  });

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

  const handleViewKyc = async () => {
    try {
      const { data } = await axiosInstance.post(`/agreement/view/${currentLead?.id}`);
      const signedUrl = data.complete_signed_url || data.signed_url || data.latest_signed_url;
      if (!signedUrl) {
        toast.error("Failed to get KYC document link!");
        return;
      }
      setKycUrl(signedUrl);
      setIsKycModalOpen(true);
    } catch (error) {
      toast.error("Unable to fetch KYC document");
    }
  };

  const fetchData = async () => {
    try {
      const [sourcesRes, responsesRes, usersRes, branchesRes] = await Promise.all([
        apiCall("GET", "/lead-config/sources/?skip=0&limit=100"),
        apiCall("GET", "/lead-config/responses/?skip=0&limit=100"),
        apiCall("GET", "/users/?skip=0&limit=100&active_only=false"),
        apiCall("GET", "/branches/?skip=0&limit=100"),
      ]);
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
      // ---- Build user name map: { employee_code -> name }
      const usersArr = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes) ? usersRes : [];
      const uMap = {};
      usersArr.forEach((u) => {
        if (u?.employee_code) uMap[u.employee_code] = u?.name || u.employee_code;
      });
      setUserNameMap(uMap);

      // ---- Build branch name map: { id -> name }
      const rawBranches =
        Array.isArray(branchesRes?.data) ? branchesRes.data :
          Array.isArray(branchesRes?.items) ? branchesRes.items :
            Array.isArray(branchesRes?.branches) ? branchesRes.branches :
              Array.isArray(branchesRes) ? branchesRes : [];
      const bMap = {};
      rawBranches.forEach((b) => {
        if (b?.id != null) bMap[b.id] = b?.name || b?.branch_name || `Branch #${b.id}`;
      });
      setBranchNameMap(bMap);
    } catch (err) {
      console.log("Error fetching data:", err);
    }
  };

  const handleUpdateLead = async () => {
    try {
      setLoading(true);
      const updateData = { ...editFormData };
      const respName = getResponseNameById(updateData.lead_response_id);

      if (updateData.dob) {
        updateData.dob = new Date(updateData.dob).toISOString().split("T")[0];
      }
      if (respName === "ft") {
        if (!updateData.ft_from_date || !updateData.ft_to_date) {
          toast.error("Please set both FT From and FT To dates before saving.");
          setLoading(false);
          return;
        }
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
        updateData.segment = updateData.segment
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);
      }
      if (updateData.comment && typeof updateData.comment === "string") {
        updateData.comment = { text: updateData.comment };
      }

      const response = await apiCall("PUT", `/leads/${currentLead.id}`, updateData);
      setCurrentLead(response);
      setIsEditMode(false);

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
      await apiCall("PUT", `/leads/navigation/mark-called/${currentLead.assignment_id}`);
      await fetchCurrentLead();
      setIsOpenSource(false);
    } catch (err) {
      setError(err);
    }
  };

  const handleCancelEdit = () => {
    setEditFormData(currentLead);
    setIsEditMode(false);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchCurrentLead();
    fetchData();
  }, [id]);

  let parsedSegment = [];
  if (currentLead?.segment) {
    try {
      parsedSegment = JSON.parse(currentLead.segment);
    } catch {
      parsedSegment = [currentLead.segment];
    }
  }
  const displaySegment = parsedSegment.join(", ");

  const getResponseNameById = (id) => {
    const match = leadResponses.find((r) => r.value === id || r.id === id);
    return match?.label?.toLowerCase?.() ?? match?.name?.toLowerCase?.() ?? "";
  };

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

  const handleEditFTInline = () => {
    const ymdFrom = currentLead?.ft_from_date ? dmyToYmd(currentLead.ft_from_date) : "";
    const ymdTo = currentLead?.ft_to_date ? dmyToYmd(currentLead.ft_to_date) : "";
    setFTFromDate(ymdFrom);
    setFTToDate(ymdTo);
    setShowFTModal(true);
  };

  const handleEditCallbackInline = () => {
    setCallBackDate(isoToDatetimeLocal(currentLead?.call_back_date || ""));
    setShowCallBackModal(true);
  };

  if (loading && !currentLead) return <LoadingState />;
  if (error && !currentLead) return <ErrorState error={error} onRetry={fetchCurrentLead} />;

  const userInfo =
    typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user_info")) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <LeadHeader currentLead={currentLead} />

        {/* === Compact Meta Info Bar (Assigned To + Branch) === */}
        {currentLead && (
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Assigned To */}
              <div className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50">
                  <UserCheck size={14} className="text-indigo-600" />
                </span>
                <span className="font-medium text-slate-900">Assigned</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[160px] sm:max-w-[220px]" title={userNameMap[currentLead?.assigned_to_user] || currentLead?.assigned_to_user || "—"}>
                  {userNameMap[currentLead?.assigned_to_user] || "—"}
                  {currentLead?.assigned_to_user ? (
                    <span className="text-slate-500"> ({currentLead.assigned_to_user})</span>
                  ) : null}
                </span>
              </div>

              {/* Branch */}
              {hasPermission("lead_branch_view") && <div className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                  <Building size={14} className="text-emerald-600" />
                </span>
                <span className="font-medium text-slate-900">Branch</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[160px] sm:max-w-[220px]" title={branchNameMap[currentLead?.branch_id] || (currentLead?.branch_id ? `#${currentLead.branch_id}` : "—")}>
                  {branchNameMap[currentLead?.branch_id] || "—"}
                  {currentLead?.branch_id ? (
                    <span className="text-slate-500"> (#{currentLead.branch_id})</span>
                  ) : null}
                </span>
              </div>}
            </div>
          </div>
        )}


        {currentLead?.lead_response_id &&
          (() => {
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p>{typeof error === "string" ? error : error?.message || JSON.stringify(error)}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <ActionButtons
          currentLead={currentLead}
          loading={loading}
          onCallClick={() => setIsOpenSource(true)}
          onKycClick={fetchKycUserDetails}
          kycLoading={kycLoading}
          onPaymentClick={() => setIsOpenPayment(true)}
          onSendEmailClick={() => setIsEmailModalOpen(true)}
          onSendSMSClick={() => setIsSMSModalOpen(true)}
          onViewEmailLogsClick={() => setIsEmailModalOpen(true)}
          onRecordingsClick={() => setIsRecordingsModalOpen(true)}
          onViewKycClick={handleViewKyc}
          onDocumentsClick={() => setIsDocumentsModalOpen(true)}
          onInvoiceClick={() => setIsInvoiceModalOpen(true)}
          onShareClick={() => setIsShareModalOpen(true)}
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2 ml-4">
            {hasPermission("lead_story_view") && <button
              onClick={() => setIsStoryModalOpen(true)}
              className="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow"
              title="View Story"
            >
              <BookOpenText size={20} />
            </button>}

            <button
              onClick={() => setIsCommentsModalOpen(true)}
              className="w-10 h-10 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center shadow"
              title="Comments"
            >
              <MessageCircle size={20} />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => (isEditMode ? handleCancelEdit() : setIsEditMode(true))}
              disabled={!currentLead}
              aria-pressed={isEditMode}
              className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-all ${isEditMode
                ? "border-red-300 text-red-700 bg-white hover:bg-red-50 hover:border-red-400 focus:ring-2 focus:ring-red-200"
                : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 focus:ring-2 focus:ring-slate-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isEditMode ? "bg-red-500" : "bg-indigo-500"
                  }`}
                aria-hidden="true"
              />
              {isEditMode ? "Back" : "Edit"}
              {isEditMode ? (
                <X size={16} className="opacity-80 group-hover:opacity-100" />
              ) : (
                <Edit3 size={16} className="opacity-80 group-hover:opacity-100" />
              )}
            </button>
          </div>
        </div>

        {isSMSModalOpen && (
          <SMSModalWithLogs
            open
            onClose={() => setIsSMSModalOpen(false)}
            leadMobile={currentLead?.mobile}
            leadName={currentLead?.full_name}
          />
        )}

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

        {/* Save */}
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

        {/* Extracted Modals */}
        <DocumentsModal
          open={isDocumentsModalOpen}
          onClose={() => setIsDocumentsModalOpen(false)}
          currentLead={currentLead}
          aadharFront={aadharFront}
          aadharBack={aadharBack}
          panPic={panPic}
          aadharFrontPreview={aadharFrontPreview}
          aadharBackPreview={aadharBackPreview}
          panPicPreview={panPicPreview}
          setAadharFront={setAadharFront}
          setAadharBack={setAadharBack}
          setPanPic={setPanPic}
          setAadharFrontPreview={setAadharFrontPreview}
          setAadharBackPreview={setAadharBackPreview}
          setPanPicPreview={setPanPicPreview}
          handleFileChange={handleFileChange}
          onUploaded={fetchCurrentLead}
        />

        <ConfirmCalledModal
          open={isOpenSource}
          onClose={() => setIsOpenSource(false)}
          onConfirm={handleMarkAsCalled}
        />

        <KycViewerModal
          open={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          url={kycUrl}
          canDownload={(typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user_info"))?.role
            : "") === "SUPERADMIN"}
        />

        {isCommentsModalOpen && (
          <CommentModal isOpen onClose={() => setIsCommentsModalOpen(false)} leadId={currentLead?.id} />
        )}

        {isInvoiceModalOpen && (
          <InvoiceList isOpen onClose={() => setIsInvoiceModalOpen(false)} leadId={currentLead?.id} />
        )}

        {isRecordingsModalOpen && (
          <RecordingsModal open onClose={() => setIsRecordingsModalOpen(false)} leadId={currentLead?.id} />
        )}

        {isShareModalOpen && (
          <LeadShareModal
            isOpen
            onClose={() => setIsShareModalOpen(false)}
            leadId={currentLead?.id}
            onSuccess={() => fetchCurrentLead()}
          />
        )}

        <FTModal
          open={showFTModal}
          onClose={() => {
            const prev = cancelFT();
            if (prev != null) setEditFormData((p) => ({ ...p, lead_response_id: prev }));
          }}
          onSave={async (payload) => {
            try {
              const ftResp = leadResponses.find((r) => (r.label || r.name || "").toLowerCase() === "ft");
              const ftResponseId = ftResp?.value ?? ftResp?.id;
              if (!ftResponseId) throw new Error("FT response not found");

              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: ftResponseId,
                ft_from_date: payload.ft_from_date,
                ft_to_date: payload.ft_to_date,
                segment: payload.segment,
                ft_service_type: payload.ft_service_type,
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
            if (prev != null) setEditFormData((p) => ({ ...p, lead_response_id: prev }));
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

      {isOpenPayment && (
        <PaymentModel
          open
          setOpen={setIsOpenPayment}
          name={currentLead?.full_name}
          phone={currentLead?.mobile}
          email={currentLead?.email}
          service={displaySegment}
          lead_id={currentLead?.id}
        />
      )}

      {isStoryModalOpen && <StoryModal isOpen onClose={() => setIsStoryModalOpen(false)} leadId={currentLead?.id} />}

      {isEmailModalOpen && (
        <EmailModalWithLogs open onClose={() => setIsEmailModalOpen(false)} leadEmail={currentLead?.email} leadName={currentLead?.full_name} />
      )}
    </div>
  );
};

export default Lead;
