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
import CreateManualePayment from "@/components/manuale/CreateManualePayment";
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

import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { formatCallbackForAPI, isoToDatetimeLocal, toIST } from "@/utils/dateUtils";
import DocumentViewer from "@/components/DocumentViewer";
import { ErrorHandling } from "@/helper/ErrorHandling";
import KycViewerOverlay from "@/components/Lead/ID/KycViewerModal";

/* ========================= THEME HELPERS (colors only) =========================
   Use CSS variables defined in your global theme:

   --theme-page-bg, --theme-card-bg, --theme-surface, --theme-text, --theme-muted,
   --theme-border, --theme-primary, --theme-success, --theme-warning, --theme-info

   Nothing else changed—just colors wired to variables.
=============================================================================== */

const canonRole = (s) => {
  if (!s) return "";
  let x = String(s).trim().toUpperCase();
  x = x.replace(/\s+/g, "_");
  if (x === "SUPER_ADMINISTRATOR") x = "SUPERADMIN";
  return x;
};

function buildRoleMap(list) {
  const out = {};
  (Array.isArray(list) ? list : []).forEach((r) => {
    const id = r?.id != null ? String(r.id) : "";
    const key = canonRole(r?.name);
    if (id && key) out[id] = key;
  });
  return out;
}

async function loadRoleMap() {
  try {
    const cached = JSON.parse(localStorage.getItem("roleMap") || "{}");
    if (cached && typeof cached === "object" && Object.keys(cached).length) {
      return cached;
    }
  } catch { }

  try {
    const res = await axiosInstance.get("/profile-role/", {
      params: { skip: 0, limit: 100, order_by: "hierarchy_level" },
    });
    const map = buildRoleMap(res?.data);
    if (Object.keys(map).length) localStorage.setItem("roleMap", JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

function getEffectiveRole({ accessToken, userInfo, roleMap = {} }) {
  try {
    if (accessToken) {
      const d = jwtDecode(accessToken) || {};
      const jwtRole =
        d.role_name ||
        d.role ||
        d.profile_role?.name ||
        d.user?.role_name ||
        d.user?.role ||
        "";
      const r1 = canonRole(jwtRole);
      if (r1) return r1;

      const jwtRoleId =
        d.role_id ?? d.user?.role_id ?? d.profile_role?.id ?? null;
      if (jwtRoleId != null) {
        const mapped = roleMap[String(jwtRoleId)];
        if (mapped) return mapped;
      }
    }
  } catch { }

  if (userInfo) {
    const uiRole =
      userInfo.role_name ||
      userInfo.role ||
      userInfo.profile_role?.name ||
      userInfo.user?.role_name ||
      userInfo.user?.role ||
      "";
    const r3 = canonRole(uiRole);
    if (r3) return r3;

    const uiRoleId =
      userInfo.role_id ??
      userInfo.user?.role_id ??
      userInfo.profile_role?.id ??
      null;
    if (uiRoleId != null) {
      const mapped = roleMap[String(uiRoleId)];
      if (mapped) return mapped;
    }
  }

  return "";
}

const normalizePhoneIN = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/[^\d+]/g, "");
  if (s.startsWith("+")) return s;
  s = s.replace(/^0+/, "");
  if (s.length === 12 && s.startsWith("91")) return `+${s}`;
  if (s.length === 10) return `+91${s}`;
  if (!s.startsWith("+")) return `+91${s}`;
  return s;
};

function useRoleKey() {
  const [roleKey, setRoleKey] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ck = Cookies.get("role_key");
        if (ck) {
          if (alive) setRoleKey(canonRole(ck));
          return;
        }
        const roleMap = await loadRoleMap();
        const token = Cookies.get("access_token");
        const uiRaw = Cookies.get("user_info");
        const userInfo = uiRaw ? JSON.parse(uiRaw) : null;
        const computed = getEffectiveRole({ accessToken: token, userInfo, roleMap });
        if (alive) setRoleKey(computed);
      } catch {
        if (alive) setRoleKey("");
      }
    })();
    return () => { alive = false; };
  }, []);

  return roleKey;
}

function useIsSuperAdmin() {
  const roleKey = useRoleKey();
  return roleKey === "SUPERADMIN";
}

const Lead = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const isSuperAdmin = useIsSuperAdmin();

  const [isOpenPayment, setIsOpenPayment] = useState(false);
  const [isOpenManualePayment, setIsOpenManualePayment] = useState(false);
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
  const [kycSigningUrl, setKycSigningUrl] = useState(null);
  const [kycUrl, setKycUrl] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [branchNameMap, setBranchNameMap] = useState({});

  const [showFTModal, setShowFTModal] = useState(false);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");
  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackDate, setCallBackDate] = useState("");
  const [pendingPrevResponseId, setPendingPrevResponseId] = useState(null);

  const [docOpen, setDocOpen] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docTitle, setDocTitle] = useState("");

  const [ftServiceType, setFTServiceType] = useState("CALL");

  const openDocViewer = (url, title = "Invoice") => {
    if (!url) return ErrorHandling({ defaultError: "Document URL not available" });
    setDocUrl(url);
    setDocTitle(title);
    setDocOpen(true);
  };

  const didInit = useRef(false);

  const handleCallClick = async () => {
    try {
      const raw = currentLead?.mobile || currentLead?.phone || currentLead?.contact_number;
      const toNumber = normalizePhoneIN(raw);

      if (!toNumber) {
        return ErrorHandling({ defaultError: "Mobile number not found for this lead." });
      }

      await axiosInstance.post(
        "/vbc/call",
        { to_number: toNumber },
        {
          headers: { "Content-Type": "application/json", Accept: "application/json" }
        }
      );

      toast.success(`Calling ${toNumber}`);
      setIsOpenSource(true);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to place call" });
    }
  };

  // Put this helper above apiCall (or inside it)
  function extractErrorDetail(err) {
    // Raw payloads we might see
    const data = err?.response?.data;

    // 1) Your case: { detail: { message: "...", errors: ["...","..."] } }
    if (data?.detail && typeof data.detail === "object") {
      const msg = String(data.detail.message || data.detail.msg || "").trim();
      const arr = Array.isArray(data.detail.errors) ? data.detail.errors : [];
      const joined = arr.filter(Boolean).join("; ");
      if (msg && joined) return `${msg} — ${joined}`;
      if (msg) return msg;
      if (joined) return joined;
    }

    // 2) Sometimes backends send plain string detail
    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }

    // 3) Alternate top-level message
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }

    // 4) Axios/network/message fallback
    if (err?.message) return err.message;

    return "Something went wrong";
  }

  const apiCall = async (method, endpoint, data = null) => {
    try {
      const config = { method, url: endpoint };
      if (data) config.data = data;
      const response = await axiosInstance(config);
      return response.data;
    } catch (err) {
      const status = err?.response?.status ?? null;
      const detailStr = extractErrorDetail(err); // <-- normalized for ErrorHandling/toast

      const e = new Error(detailStr);
      e.status = status;
      e.detail = detailStr;
      e.raw = err;
      throw e;
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
    setKycSigningUrl(null);
    if (!currentLead?.mobile) {
      ErrorHandling({ defaultError: "Mobile number not found for this lead." });
      return;
    }
    setKycLoading(true);
    const formData = { mobile: currentLead?.mobile };
    try {
      const { data } = await axiosInstance.post("/kyc_user_details", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      });
      const url =
        data?.signing_url ||
        data?.signer_details?.requests?.[0]?.signing_url ||
        data?.signer_details?.signing_url ||
        null;
      if (url) setKycSigningUrl(url);
      toast.success("KYC initiated successfully!");
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to initiate KYC:" });
    } finally {
      setKycLoading(false);
    }
  };

  const handleCopyKycLink = async () => {
    try {
      if (!kycSigningUrl) return false;
      await navigator.clipboard.writeText(kycSigningUrl);
      toast.success("Signing link copied!");
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const ta = document.createElement("textarea");
        ta.value = kycSigningUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Signing link copied!");
        return true;
      } catch {
        toast.error("Unable to copy link");
        return false;
      }
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
      const [sourcesRes, responsesRes, branchesRes] = await Promise.all([
        apiCall("GET", "/lead-config/sources/?skip=0&limit=100"),
        apiCall("GET", "/lead-config/responses/?skip=0&limit=100"),
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

      try {
        if (updateData.dob) {
          updateData.dob = updateData.dob && new Date(updateData.dob).toISOString().split("T")[0];
        }
      } catch {
        updateData.dob = null;
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
      console.error("err : ", err);
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

  const handleEditFTInline = () => {
    const ymdFrom = currentLead?.ft_from_date
      ? dmyToYmd(currentLead.ft_from_date)
      : "";
    const ymdTo = currentLead?.ft_to_date
      ? dmyToYmd(currentLead.ft_to_date)
      : "";
    setFTFromDate(ymdFrom);
    setFTToDate(ymdTo);
    setFTServiceType(currentLead?.ft_service_type || "CALL");
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
      setFTServiceType(lead?.ft_service_type || "CALL");
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

  // ✅ Permission denied view for 403
  if (!loading && !currentLead && error?.status === 403) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--theme-page-bg)", color: "var(--theme-text)" }}
      >
        <div
          className="max-w-lg w-full rounded-xl p-6 shadow"
          style={{
            background: "var(--theme-card-bg)",
            border: "1px solid var(--theme-border)",
          }}
        >
          <div className="flex items-start">
            <AlertCircle
              className="mr-3 flex-shrink-0"
              size={22}
              style={{ color: "var(--theme-warning)" }}
            />
            <div>
              <h2 className="text-lg font-semibold">Access denied</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--theme-muted)" }}>
                {error?.detail || "You do not have permission to view this lead."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => history.back()}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                border: "1px solid var(--theme-border)",
                background: "var(--theme-surface)",
                color: "var(--theme-text)",
              }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !currentLead) return <LoadingState />;
  if (error && !currentLead)
    return <ErrorState error={error} onRetry={fetchCurrentLead} />;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--theme-page-bg)", color: "var(--theme-text)" }}
    >
      <div className="mx-2 px-4 py-6">
        <div style={{ color: "var(--theme-text)" }}>
          <LeadHeader
            currentLead={currentLead}
            branchNameMap={branchNameMap}
            isSuperAdmin={isSuperAdmin}
          />
        </div>

        {currentLead?.lead_response_id &&
          (() => {
            const respName = getResponseNameById(currentLead.lead_response_id);

            if (respName === "ft") {
              return (
                <div
                  className="mb-4 rounded-lg p-4 text-sm flex items-center justify-between"
                  style={{
                    border: `1px solid var(--theme-border)`,
                    background: "color-mix(in srgb, var(--theme-primary) 10%, var(--theme-card-bg))",
                  }}
                >
                  <div style={{ color: "var(--theme-text)" }}>
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
                    className="px-3 py-1.5 text-xs rounded"
                    style={{
                      background: "var(--theme-primary)",
                      color: "white",
                    }}
                  >
                    Edit FT Dates
                  </button>
                </div>
              );
            }

            if (respName === "call back" || respName === "callback") {
              return (
                <div
                  className="mb-4 rounded-lg p-4 text-sm flex items-center justify-between"
                  style={{
                    border: `1px solid var(--theme-border)`,
                    background: "color-mix(in srgb, var(--theme-warning) 12%, var(--theme-card-bg))",
                  }}
                >
                  <div style={{ color: "var(--theme-text)" }}>
                    <div className="font-semibold">Call Back</div>
                    <div className="mt-1">
                      <span className="font-medium">Call Back Date:</span>{" "}
                      {toIST(currentLead?.call_back_date)}
                    </div>
                  </div>
                  <button
                    onClick={handleEditCallbackInline}
                    className="px-3 py-1.5 text-xs rounded"
                    style={{
                      background: "var(--theme-warning)",
                      color: "white",
                    }}
                  >
                    Edit Call Back
                  </button>
                </div>
              );
            }

            return null;
          })()}

        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              background: "color-mix(in srgb, var(--theme-error) 10%, var(--theme-card-bg))",
              border: `1px solid var(--theme-error)`,
              color: "var(--theme-text)",
            }}
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5" style={{ color: "var(--theme-error)" }} />
              <p className="ml-2">
                {typeof error === "string"
                  ? error
                  : error?.message || JSON.stringify(error)}
              </p>
              <button
                onClick={() => setError(null)}
                className="ml-auto"
                title="Dismiss"
                style={{ color: "var(--theme-error)" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div style={{ color: "var(--theme-text)" }}>
          <ActionButtons
            currentLead={currentLead}
            loading={loading}
            onRefresh={fetchCurrentLead}
            onKycClick={fetchKycUserDetails}
            kycLoading={kycLoading}
            kycSigningUrl={kycSigningUrl}
            onCopyKycLink={handleCopyKycLink}
            onPaymentClick={() => setIsOpenPayment(true)}
            onManualePaymentClick={() => setIsOpenManualePayment(true)}
            onSendEmailClick={() => setIsEmailModalOpen(true)}
            onSendSMSClick={() => setIsSMSModalOpen(true)}
            onViewEmailLogsClick={() => setIsEmailModalOpen(true)}
            onRecordingsClick={() => setIsRecordingsModalOpen(true)}
            onViewKycClick={handleViewKyc}
            onDocumentsClick={() => setIsDocumentsModalOpen(true)}
            onInvoiceClick={() => setIsInvoiceModalOpen(true)}
            onShareClick={() => setIsShareModalOpen(true)}
          // (buttons inside should already be themed or neutral; if needed, add style overrides there)
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2 ml-4">
            {hasPermission("lead_story_view") && (
              <button
                onClick={() => setIsStoryModalOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow"
                title="View Story"
                style={{ background: "var(--theme-primary)", color: "white" }}
              >
                <BookOpenText size={20} />
              </button>
            )}

            <button
              onClick={() => setIsCommentsModalOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow"
              title="Comments"
              style={{
                background: "var(--theme-info, #12b0b9)",
                color: "white",
              }}
            >
              <MessageCircle size={20} />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => (isEditMode ? handleCancelEdit() : setIsEditMode(true))}
              disabled={!currentLead}
              aria-pressed={isEditMode}
              className="group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                border: `1px solid var(--theme-border)`,
                background: "var(--theme-card-bg)",
                color: isEditMode ? "var(--theme-error)" : "var(--theme-text)",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: isEditMode ? "var(--theme-error)" : "var(--theme-primary)" }}
                aria-hidden="true"
              />
              {isEditMode ? "Back" : "Edit"}
              {isEditMode ? (
                <X size={16} />
              ) : (
                <Edit3 size={16} />
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
            leadId={currentLead?.id}
          />
        )}

        {/* Lead Details */}
        <div style={{ color: "var(--theme-text)" }}>
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
        </div>

        {/* Save */}
        {isEditMode && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleUpdateLead}
              disabled={loading}
              className="flex items-center px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{
                background: "var(--theme-success)",
                color: "white",
              }}
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

        <KycViewerOverlay
          open={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          url={kycUrl}
          canDownload={isSuperAdmin}
          title="KYC Document"
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
              setEditFormData((p) => ({ ...p, lead_response_id: pendingPrevResponseId }));
            }
          }}
          onSave={async (payload) => {
            try {
              const ftResp = leadResponses.find((r) => (r.label || r.name || "").toLowerCase() === "ft");
              const ftResponseId = ftResp?.value ?? ftResp?.id;
              await axiosInstance.patch(`/leads/${currentLead.id}/response`, {
                lead_response_id: ftResponseId,
                ...payload,
              });
              toast.success("FT response saved!");
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
          serviceType={ftServiceType}
          setServiceType={setFTServiceType}
          serviceTypeOptions={["Call", "SMS"]}
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

      {isOpenManualePayment && (
        <CreateManualePayment
          open={isOpenManualePayment}
          setOpen={setIsOpenManualePayment}
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
