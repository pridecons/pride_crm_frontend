// Main Lead Component
"use client";

import React, { useEffect, useState, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { useParams } from "next/navigation";
import {
  Edit3,
  Save,
  X,
  AlertCircle,
  MessageCircle,
  BookOpenText,
  Building,
  UserCheck,
} from "lucide-react";
import PaymentModel from "@/components/Fetch_Lead/PaymentModel";
import toast from "react-hot-toast";
import LoadingState from "@/components/LoadingState";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import EmailModalWithLogs from "@/components/Lead/EmailModalWithTabs";
import InvoiceList from "@/components/Lead/InvoiceList";
import CallBackModal from "@/components/Lead/CallBackModal";
import FTModal from "@/components/Lead/FTModal";
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
import { usePermissions } from "@/context/PermissionsContext";

// NEW: robust SUPERADMIN detector
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { formatCallbackForAPI, isoToDatetimeLocal, toIST } from "@/utils/dateUtils";
import DocumentViewer from "@/components/DocumentViewer";
import { ErrorHandling } from "@/helper/ErrorHandling";

// ---- role helpers -----------------------------------------------------------
const ROLE_ID_TO_KEY = {
  "1": "SUPERADMIN",
  "2": "BRANCH_MANAGER",
  "3": "HR",
  "4": "SALES_MANAGER",
  "5": "TL",
  "6": "SBA",
  "7": "BA",
  "8": "BA",
  "9": "RESEARCHER",
  "10": "COMPLIANCE_OFFICER",
  "11": "TESTPROFILE",
};

const canonRole = (s) => {
  if (!s) return "";
  let x = String(s).trim().toUpperCase();
  x = x.replace(/\s+/g, "_"); // "BRANCH MANAGER" -> "BRANCH_MANAGER"
  if (x === "SUPER_ADMINISTRATOR") x = "SUPERADMIN";
  return x;
};

// --- add near top (helpers) ---
const normalizePhoneIN = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();

  // keep only + and digits
  s = s.replace(/[^\d+]/g, "");

  // already E.164-ish
  if (s.startsWith("+")) return s;

  // strip leading zeros
  s = s.replace(/^0+/, "");

  // "91xxxxxxxxxx" -> "+91xxxxxxxxxx"
  if (s.length === 12 && s.startsWith("91")) return `+${s}`;

  // 10-digit local -> "+91"
  if (s.length === 10) return `+91${s}`;

  // fallback: if it doesn't start with '+', prefix +91
  if (!s.startsWith("+")) return `+91${s}`;

  return s;
};

function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    try {
      // Try cookie user_info first
      const uiRaw = Cookies.get("user_info");
      let roleKey = "";

      if (uiRaw) {
        const ui = JSON.parse(uiRaw);
        const r =
          ui?.role_name ||
          ui?.role ||
          ui?.profile_role?.name ||
          ui?.user?.role_name ||
          ui?.user?.role ||
          null;
        roleKey = canonRole(r);

        if (!roleKey) {
          const rid =
            ui?.role_id ?? ui?.user?.role_id ?? ui?.profile_role?.id ?? null;
          if (rid != null) {
            roleKey = ROLE_ID_TO_KEY[String(rid)] || "";
          }
        }
      }

      // Fallback to JWT if needed
      if (!roleKey) {
        const token = Cookies.get("access_token");
        if (token) {
          const d = jwtDecode(token) || {};
          const rTok =
            d?.role_name ||
            d?.role ||
            d?.profile_role?.name ||
            d?.user?.role_name ||
            d?.user?.role ||
            null;
          roleKey = canonRole(rTok);

          if (!roleKey) {
            const rid =
              d?.role_id ?? d?.user?.role_id ?? d?.profile_role?.id ?? null;
            if (rid != null) roleKey = ROLE_ID_TO_KEY[String(rid)] || "";
          }
        }
      }

      setIsSuperAdmin(roleKey === "SUPERADMIN");
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  return isSuperAdmin;
}

const Lead = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const isSuperAdmin = useIsSuperAdmin(); // <-- use this to show Branch ONLY for SUPERADMIN

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

  const [userNameMap, setUserNameMap] = useState({}); // { EMP006: "shivi", ... }
  const [branchNameMap, setBranchNameMap] = useState({}); // { 1: "Main Branch", ... }

  // === NewLeadsTable-style modal state ===
  const [showFTModal, setShowFTModal] = useState(false);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");
  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackDate, setCallBackDate] = useState("");
  const [pendingPrevResponseId, setPendingPrevResponseId] = useState(null);

  const [docOpen, setDocOpen] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");

  const openDocViewer = (url, title = "Invoice") => {
    if (!url) return ErrorHandling({ defaultError: "Document URL not available" });
    setDocUrl(url);
    setDocTitle(title);
    setDocOpen(true);
  };

  // fetch guard (StrictMode)
  const didInit = useRef(false);

  // --- add inside the Lead component ---
const handleCallClick = async () => {
  try {
    const raw = currentLead?.mobile || currentLead?.phone || currentLead?.contact_number;
    const toNumber = normalizePhoneIN(raw);

    if (!toNumber) {
      return ErrorHandling({ defaultError: "Mobile number not found for this lead." });
    }

    // IMPORTANT: send as form-urlencoded (backend expects Form(...))
    await axiosInstance.post(
  "/vbc/call",
  { to_number: toNumber },
  {
    headers: { "Content-Type": "application/json", Accept: "application/json" }
  }
);


    toast.success(`Calling ${toNumber}`);
    // optional: open your confirm modal to mark called
    setIsOpenSource(true);
  } catch (err) {
    ErrorHandling({ error: err, defaultError: "Failed to place call" });
  }
};

  const apiCall = async (method, endpoint, data = null) => {
    try {
      const config = { method, url: endpoint };
      if (data) config.data = data;
      const response = await axiosInstance(config);
      return response.data;
    } catch (err) {
      throw new Error(
        err.response?.data?.detail || `Failed to ${method} ${endpoint}`
      );
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

  const fetchKycUserDetails = async () => {
    if (!currentLead?.mobile) {
      ErrorHandling({ defaultError: "Mobile number not found for this lead." });
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
      // toast.error(
      //   "Failed to initiate KYC: " +
      //   (err.response?.data?.detail || err.message)
        ErrorHandling({ error: err, defaultError: "Failed to initiate KYC:" });
    } finally {
      setKycLoading(false);
    }
  };

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      ErrorHandling({ defaultError: "File size must be under 2MB" });
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
      const { data } = await axiosInstance.post(
        `/agreement/view/${currentLead?.id}`
      );
      const signedUrl =
        data.complete_signed_url || data.signed_url || data.latest_signed_url;
      if (!signedUrl) {
        ErrorHandling({ defaultError: "Failed to get KYC document link!" });
        return;
      }
      setKycUrl(signedUrl);
      setIsKycModalOpen(true);
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Unable to fetch KYC document" });
    }
  };

  const fetchData = async () => {
    try {
      const [sourcesRes, responsesRes, usersRes, branchesRes] =
        await Promise.all([
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
      // Build user name map
      const usersArr = Array.isArray(usersRes?.data)
        ? usersRes.data
        : Array.isArray(usersRes)
          ? usersRes
          : [];
      const uMap = {};
      usersArr.forEach((u) => {
        if (u?.employee_code)
          uMap[u.employee_code] = u?.name || u.employee_code;
      });
      setUserNameMap(uMap);

      // Build branch name map
      const rawBranches = Array.isArray(branchesRes?.data)
        ? branchesRes.data
        : Array.isArray(branchesRes?.items)
          ? branchesRes.items
          : Array.isArray(branchesRes?.branches)
            ? branchesRes.branches
            : Array.isArray(branchesRes)
              ? branchesRes
              : [];
      const bMap = {};
      rawBranches.forEach((b) => {
        if (b?.id != null)
          bMap[b.id] = b?.name || b?.branch_name || `Branch #${b.id}`;
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

      try{
        if (updateData.dob) {
        updateData.dob = updateData.dob && new Date(updateData.dob).toISOString().split("T")[0];
      }
      }catch{
        updateData.dob=null
      }
      if (respName === "ft") {
        if (!updateData.ft_from_date || !updateData.ft_to_date) {
          ErrorHandling({ defaultError: "Please set both FT From and FT To dates before saving." });
          setLoading(false);
          return;
        }
        updateData.ft_from_date = ymdToDmy(updateData.ft_from_date);
        updateData.ft_to_date = ymdToDmy(updateData.ft_to_date);
      }
      if (respName === "call back" || respName === "callback") {
        if (!updateData.call_back_date) {
          ErrorHandling({ defaultError: "Please set a Call Back date & time before saving." });
          setLoading(false);
          return;
        }
        updateData.call_back_date = formatCallbackForAPI(updateData.call_back_date);
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

      const response = await apiCall(
        "PUT",
        `/leads/${currentLead.id}`,
        updateData
      );
      setCurrentLead(response);
      setIsEditMode(false);

      if (aadharFront || aadharBack || panPic) {
        const formData = new FormData();
        if (aadharFront) formData.append("aadhar_front", aadharFront);
        if (aadharBack) formData.append("aadhar_back", aadharBack);
        if (panPic) formData.append("pan_pic", panPic);

        await axiosInstance.post(
          `/leads/${currentLead.id}/upload-documents`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        toast.success("Documents uploaded successfully!");
      }

      toast.success("Lead updated successfully!");
      setError(null);
    } catch (err) {
      setError(err);
      ErrorHandling({ error: err, defaultError: "Error updating lead" });
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

  const getResponseNameById = (rid) => {
    const match = leadResponses.find((r) => r.value === rid || r.id === rid);
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


  // ---- Inline Edit buttons mimic NewLeadsTable ----
  const handleEditFTInline = () => {
    const ymdFrom = currentLead?.ft_from_date
      ? dmyToYmd(currentLead.ft_from_date)
      : "";
    const ymdTo = currentLead?.ft_to_date
      ? dmyToYmd(currentLead.ft_to_date)
      : "";
    setFTFromDate(ymdFrom);
    setFTToDate(ymdTo);
    setPendingPrevResponseId(currentLead?.lead_response_id ?? null);
    setShowFTModal(true);
  };

  const handleEditCallbackInline = () => {
    setCallBackDate(isoToDatetimeLocal(currentLead?.call_back_date || ""));
    setPendingPrevResponseId(currentLead?.lead_response_id ?? null);
    setShowCallBackModal(true);
  };

  const handleResponseChange = async (maybeLeadOrId, maybeId) => {
    const lead =
      typeof maybeId === "undefined" ? currentLead : maybeLeadOrId;
    const newResponseId =
      typeof maybeId === "undefined" ? maybeLeadOrId : maybeId;

    const selected = leadResponses.find(
      (r) => r.value == newResponseId || r.id == newResponseId
    );
    const responseName = (selected?.label || selected?.name || "")
      .toLowerCase();

    if (responseName === "ft") {
      setFTFromDate("");
      setFTToDate("");
      setPendingPrevResponseId(lead?.lead_response_id ?? null);
      setShowFTModal(true);
      setEditFormData((p) => ({
        ...p,
        lead_response_id: selected?.value ?? selected?.id,
      }));
      return;
    }
    if (responseName === "call back" || responseName === "callback") {
      setCallBackDate("");
      setPendingPrevResponseId(lead?.lead_response_id ?? null);
      setShowCallBackModal(true);
      setEditFormData((p) => ({
        ...p,
        lead_response_id: selected?.value ?? selected?.id,
      }));
      return;
    }

    try {
      await axiosInstance.patch(`/leads/${lead.id}/response`, {
        lead_response_id: parseInt(selected?.value ?? selected?.id, 10),
      });
      toast.success("Response updated!");
      await fetchCurrentLead();
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to update response!" });
      setEditFormData((p) => ({
        ...p,
        lead_response_id: lead?.lead_response_id ?? null,
      }));
    }
  };

  if (loading && !currentLead) return <LoadingState />;
  if (error && !currentLead)
    return <ErrorState error={error} onRetry={fetchCurrentLead} />;

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
                <span
                  className="truncate max-w-[160px] sm:max-w-[220px]"
                  title={
                    userNameMap[currentLead?.assigned_to_user] ||
                    currentLead?.assigned_to_user ||
                    "—"
                  }
                >
                  {userNameMap[currentLead?.assigned_to_user] || "—"}
                  {currentLead?.assigned_to_user ? (
                    <span className="text-slate-500">
                      {" "}
                      ({currentLead.assigned_to_user})
                    </span>
                  ) : null}
                </span>
              </div>

              {/* Branch — SHOW ONLY TO SUPERADMIN */}
              {isSuperAdmin && (
                <div className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                    <Building size={14} className="text-emerald-600" />
                  </span>
                  <span className="font-medium text-slate-900">Branch</span>
                  <span className="text-slate-400">•</span>
                  <span
                    className="truncate max-w-[160px] sm:max-w-[220px]"
                    title={
                      branchNameMap[currentLead?.branch_id] ||
                      (currentLead?.branch_id
                        ? `#${currentLead.branch_id}`
                        : "—")
                    }
                  >
                    {branchNameMap[currentLead?.branch_id] || "—"}
                    {currentLead?.branch_id ? (
                      <span className="text-slate-500">
                        {" "}
                        (#{currentLead.branch_id})
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
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
                      {toIST(currentLead?.call_back_date)}
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
              <p>
                {typeof error === "string"
                  ? error
                  : error?.message || JSON.stringify(error)}
              </p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <ActionButtons
          currentLead={currentLead}
          loading={loading}
           onCallClick={handleCallClick}  
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
            {hasPermission("lead_story_view") && (
              <button
                onClick={() => setIsStoryModalOpen(true)}
                className="w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow"
                title="View Story"
              >
                <BookOpenText size={20} />
              </button>
            )}

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
          // Only SUPERADMIN can download
          canDownload={isSuperAdmin}
        />

        {isCommentsModalOpen && (
          <CommentModal
            isOpen
            onClose={() => setIsCommentsModalOpen(false)}
            leadId={currentLead?.id}
          />
        )}

        {isInvoiceModalOpen && (
          <InvoiceList
            isOpen
            onClose={() => setIsInvoiceModalOpen(false)}
            leadId={currentLead?.id}
            onViewPdf={(url, name) => openDocViewer(url, name || "Invoice")}
            canDownload={isSuperAdmin}
          />
        )}

        <DocumentViewer
          open={docOpen}
          onClose={() => setDocOpen(false)}
          url={docUrl}
          title={docTitle}
          canDownload={isSuperAdmin}
        />

        {isRecordingsModalOpen && (
          <RecordingsModal
            open
            onClose={() => setIsRecordingsModalOpen(false)}
            leadId={currentLead?.id}
          />
        )}

        {isShareModalOpen && (
          <LeadShareModal
            isOpen
            onClose={() => setIsShareModalOpen(false)}
            leadId={currentLead?.id}
            onSuccess={() => fetchCurrentLead()}
          />
        )}

        {/* === FT & Callback Modals === */}
        <FTModal
          open={showFTModal}
          onClose={() => {
            setShowFTModal(false);
            if (pendingPrevResponseId != null) {
              setEditFormData((p) => ({
                ...p,
                lead_response_id: pendingPrevResponseId,
              }));
            }
          }}
          onSave={async () => {
            try {
              if (!ftFromDate || !ftToDate)
                return ErrorHandling({ defaultError: "Both dates required" });
              const ftResp = leadResponses.find(
                (r) =>
                  (r.label || r.name || "").toLowerCase() === "ft"
              );
              const ftResponseId = ftResp?.value ?? ftResp?.id;
              if (!ftResponseId) throw new Error("FT response not found");

              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: ftResponseId,
                ft_from_date: ftFromDate.split("-").reverse().join("-"),
                ft_to_date: ftToDate.split("-").reverse().join("-"),
              });
              toast.success("FT response and dates saved!");
              setShowFTModal(false);
              setPendingPrevResponseId(null);
              await fetchCurrentLead();
            } catch (err) {
              ErrorHandling({ error: err, defaultError: "Failed to save FT response" });
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
            setShowCallBackModal(false);
            if (pendingPrevResponseId != null) {
              setEditFormData((p) => ({
                ...p,
                lead_response_id: pendingPrevResponseId,
              }));
            }
          }}
          onSave={async () => {
            try {
              if (!callBackDate) return ErrorHandling({ defaultError: "Call back date is required" });
              const cbResp = leadResponses.find((r) => {
                const n = (r.label || r.name || "").toLowerCase();
                return n === "call back" || n === "callback";
              });
              const cbResponseId = cbResp?.value ?? cbResp?.id;
              if (!cbResponseId) throw new Error("Callback response not found");

              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: cbResponseId,
                call_back_date: formatCallbackForAPI(callBackDate),
              });
              toast.success("Call Back response and date saved!");
              setShowCallBackModal(false);
              setPendingPrevResponseId(null);
              await fetchCurrentLead();
            } catch (err) {
              ErrorHandling({ error: err, defaultError: "Failed to save Call Back response" });
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

      {isStoryModalOpen && (
        <StoryModal
          isOpen
          onClose={() => setIsStoryModalOpen(false)}
          leadId={currentLead?.id}
        />
      )}

      {isEmailModalOpen && (
        <EmailModalWithLogs
          open
          onClose={() => setIsEmailModalOpen(false)}
          leadEmail={currentLead?.email}
          leadName={currentLead?.full_name}
        />
      )}
    </div>
  );
};

export default Lead;
