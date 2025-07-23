// Main Lead Component
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { axiosInstance } from "@/api/Axios";
import { useRouter } from "next/navigation";
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
import FetchLeadsButton from "@/components/Fetch_Lead/FetchButton";
import { toast } from "react-toastify";

const Lead = () => {
  const router = useRouter();
  const [isOpenPayment, setIsOpenPayment] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpenSource, setIsOpenSource] = useState(false);
  const [isOpenResponse, setIsOpenResponse] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [leadResponses, setLeadResponses] = useState([]);
  const [uncalledCount, setUncalledCount] = useState(0);
  const [navigationInfo, setNavigationInfo] = useState({
    position: 1,
    total_count: 0,
    has_next: false,
    has_previous: false,
  });
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panPic, setPanPic] = useState(null);

  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [panPicPreview, setPanPicPreview] = useState(null);

  const fetchKycUserDetails = async () => {
    const formData = { mobile: currentLead?.mobile };
    await axiosInstance.post("/kyc_user_details", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });
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
      throw err.response?.data?.detail || `Failed to ${method} ${endpoint}`;
    }
  };

  const fetchCurrentLead = async () => {
    try {
      setLoading(true);
      const response = await apiCall("GET", "/leads/navigation/current");
      setCurrentLead(response);
      setEditFormData(response);
      setNavigationInfo({
        position: response.position,
        total_count: response.total_count,
        has_next: response.has_next,
        has_previous: response.has_previous,
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
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

  const handleNavigation = async (direction) => {
    if (!currentLead) return;

    const canNavigate =
      direction === "next"
        ? navigationInfo.has_next
        : navigationInfo.has_previous;
    if (!canNavigate) return;

    try {
      setLoading(true);
      const response = await apiCall(
        "GET",
        `/leads/navigation/${direction}?current_assignment_id=${currentLead.assignment_id}`
      );
      setCurrentLead(response);
      setEditFormData(response);
      setNavigationInfo({
        position: response.position,
        total_count: response.total_count,
        has_next: response.has_next,
        has_previous: response.has_previous,
      });
      setIsEditMode(false);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
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
  }, []);

  const parsedSegment = currentLead?.segment ? JSON.parse(currentLead?.segment) : [];
  const displaySegment = parsedSegment?.join(", ");

  // Loading State
  if (loading && !currentLead) {
    return <LoadingState />;
  }

  // Error State
  if (error && !currentLead) {
    return <ErrorState error={error} onRetry={fetchCurrentLead} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-end mb-4">
        <FetchLeadsButton
          onSuccess={(data) => {
            setAssignments((prev) => [...prev, ...data.leads]); // Merge new leads into assignments
            toast.success(`${data.fetched_count} leads fetched successfully`);
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <LeadHeader
          navigationInfo={navigationInfo}
          uncalledCount={uncalledCount}
          currentLead={currentLead}
        />

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
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
          navigationInfo={navigationInfo}
          currentLead={currentLead}
          isEditMode={isEditMode}
          loading={loading}
          onNavigation={handleNavigation}
          onCallClick={() => setIsOpenSource(true)}
          onEditClick={() => isEditMode ? handleCancelEdit() : setIsEditMode(true)}
          onSaveClick={handleUpdateLead}
          onKycClick={fetchKycUserDetails}
          onPaymentClick={() => setIsOpenPayment(true)}
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

        {/* Assignments Summary */}
        <AssignmentsSummary
          assignments={assignments}
          currentLead={currentLead}
          uncalledCount={uncalledCount}
        />

        {/* Modals */}
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
      </div>

      <PaymentModel
        open={isOpenPayment}
        setOpen={setIsOpenPayment}
        name={currentLead?.full_name}
        phone={currentLead?.mobile}
        email={currentLead?.email}
        service={displaySegment}
      />
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
            {Array.isArray(value)
              ? value.join(", ")
              : typeof value === 'object' && value !== null
                ? value.text || JSON.stringify(value)
                : value || "Not provided"}
          </span>
        )}
      </div>
    )}
  </div>
);

// ==============================================
// AssignmentsSummary Component
// ==============================================

export const AssignmentsSummary = ({ assignments, currentLead, uncalledCount }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Assignment Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {assignments.length}
          </div>
          <div className="text-sm text-gray-600">Total Assignments</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {
              assignments.filter(
                (a) => a.assignment_id === currentLead?.assignment_id
              ).length
            }
          </div>
          <div className="text-sm text-gray-600">Current Assignment</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {uncalledCount}
          </div>
          <div className="text-sm text-gray-600">Uncalled Leads</div>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// Additional Utility Components
// ==============================================

// ErrorAlert Component
export const ErrorAlert = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        <p className="text-sm text-red-800">{error}</p>
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

// NavigationButtons Component
export const NavigationButtons = ({
  navigationInfo,
  loading,
  onNavigation
}) => {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onNavigation("previous")}
        disabled={!navigationInfo.has_previous || loading}
        className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" />
        Previous
      </button>

      <button
        onClick={() => onNavigation("next")}
        disabled={!navigationInfo.has_next || loading}
        className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ArrowRight size={16} className="ml-2" />
      </button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
// LoadingState Component
// ==============================================
export const LoadingState = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading lead information...</p>
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
        <p className="text-gray-600 mb-4">{error}</p>
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
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lead Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Position {navigationInfo.position} of{" "}
            {navigationInfo.total_count} • {uncalledCount} uncalled leads
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <StatusBadge status={currentLead?.is_call} type="call" />
          <StatusBadge status={currentLead?.kyc} type="kyc" />
          <StatusBadge status={currentLead?.is_old_lead} type="old" />
        </div>
      </div>
    </div>
  );
};

// ==============================================
// ActionButtons Component
// ==============================================

export const ActionButtons = ({
  navigationInfo,
  currentLead,
  isEditMode,
  loading,
  onNavigation,
  onCallClick,
  onEditClick,
  onSaveClick,
  onKycClick,
  onPaymentClick,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onNavigation("previous")}
          disabled={!navigationInfo.has_previous || loading}
          className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Previous
        </button>

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

        <button
          onClick={onKycClick}
          disabled={!currentLead?.email}
          className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          KYC
        </button>

        <button
          onClick={onPaymentClick}
          className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Payment
        </button>

        <button
          onClick={() => onNavigation("next")}
          disabled={!navigationInfo.has_next || loading}
          className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ArrowRight size={16} className="ml-2" />
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
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, [setEditFormData]);

  const getFileUrl = (path) => {
    if (!path) return null;

    // Remove leading slashes if any
    const cleanPath = path.startsWith("/") ? path : `/static/lead_documents/${path}`;

    // Get base URL (without /api/v1)
    const baseURL = axiosInstance.defaults.baseURL.replace("/api/v1", "");

    return `${baseURL}${cleanPath}`;
  };

  // Field definitions
  const personalFields = [
    {
      name: "full_name",
      label: "Full Name",
      icon: User,
      placeholder: "Enter full name",
    },
    {
      name: "father_name",
      label: "Father Name",
      icon: User,
      placeholder: "Enter father name",
    },
    {
      name: "director_name",
      label: "Director Name",
      icon: User,
      placeholder: "Enter director name",
    },
    {
      name: "gender",
      label: "Gender",
      icon: User,
      type: "select",
      options: [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "Other", label: "Other" },
      ],
    },
    {
      name: "marital_status",
      label: "Marital Status",
      icon: User,
      type: "select",
      options: [
        { value: "Single", label: "Single" },
        { value: "Married", label: "Married" },
        { value: "Divorced", label: "Divorced" },
        { value: "Widowed", label: "Widowed" },
      ],
    },
    { name: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
  ];

  const contactFields = [
    {
      name: "email",
      label: "Email",
      icon: Mail,
      type: "email",
      placeholder: "Enter email address",
    },
    {
      name: "mobile",
      label: "Mobile",
      icon: Phone,
      type: "tel",
      placeholder: "Enter mobile number",
    },
    {
      name: "alternate_mobile",
      label: "Alternate Mobile",
      icon: Phone,
      type: "tel",
      placeholder: "Enter alternate mobile",
    },
    {
      name: "address",
      label: "Address",
      icon: MapPin,
      type: "textarea",
      placeholder: "Enter full address",
    },
    { name: "city", label: "City", icon: MapPin, placeholder: "Enter city" },
    { name: "state", label: "State", icon: MapPin, placeholder: "Enter state" },
    {
      name: "district",
      label: "District",
      icon: MapPin,
      placeholder: "Enter district",
    },
    {
      name: "pincode",
      label: "Pincode",
      icon: MapPin,
      placeholder: "Enter pincode",
    },
    {
      name: "country",
      label: "Country",
      icon: Globe,
      placeholder: "Enter country",
    },
  ];

  const professionalFields = [
    {
      name: "occupation",
      label: "Occupation",
      icon: Briefcase,
      placeholder: "Enter occupation",
    },
    {
      name: "experience",
      label: "Experience",
      icon: Briefcase,
      placeholder: "Enter experience",
    },
    {
      name: "investment",
      label: "Investment",
      icon: Briefcase,
      placeholder: "Enter investment details",
    },
    {
      name: "segment",
      label: "Segment",
      icon: Briefcase,
      placeholder: "Enter segment (comma-separated if multiple)",
    },
    {
      name: "aadhaar",
      label: "Aadhaar Number",
      icon: CreditCard,
      placeholder: "Enter Aadhaar number",
    },
    {
      name: "pan",
      label: "PAN Number",
      icon: CreditCard,
      placeholder: "Enter PAN number",
    },
    {
      name: "gstin",
      label: "GSTIN",
      icon: Building,
      placeholder: "Enter GSTIN",
    },
    {
      name: "lead_source_id",
      label: "Lead Source",
      icon: Building,
      type: "select",
      options: leadSources,
    },
    {
      name: "lead_response_id",
      label: "Lead Response",
      icon: Building,
      type: "select",
      options: leadResponses,
    },
    {
      name: "lead_status",
      label: "Lead Status",
      icon: FileText,
      placeholder: "Enter lead status",
    },
    {
      name: "profile",
      label: "Profile",
      icon: FileText,
      placeholder: "Enter profile details",
    },
    {
      name: "call_back_date",
      label: "Callback Date",
      icon: Calendar,
      type: "datetime-local",
    },
    { name: "kyc", label: "KYC Status", icon: CheckCircle, type: "checkbox" },
    {
      name: "kyc_id",
      label: "KYC ID",
      icon: CreditCard,
      placeholder: "Enter KYC ID",
    },
    {
      name: "is_old_lead",
      label: "Old Lead",
      icon: AlertCircle,
      type: "checkbox",
    },
    {
      name: "comment",
      label: "Comment",
      icon: FileText,
      type: "textarea",
      placeholder: "Enter comments",
    },
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
          {personalFields.map((field) => (
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

      {/* Document Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FileText className="mr-2 text-indigo-500" size={20} />
          Documents
        </h3>

        {isEditMode ? (
          // Edit Mode → Show Upload Inputs + Existing Images
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
              {(aadharFrontPreview || currentLead?.aadhar_front_pic) && (
                <div className="relative mt-2 w-32 h-24">
                  <img
                    src={aadharFrontPreview || getFileUrl(currentLead.aadhar_front_pic)}
                    alt="Aadhaar Front"
                    className="w-full h-full object-cover border rounded"
                  />
                  {aadharFrontPreview && (
                    <button
                      onClick={() => { setAadharFront(null); setAadharFrontPreview(null); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
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
              {(aadharBackPreview || currentLead?.aadhar_back_pic) && (
                <div className="relative mt-2 w-32 h-24">
                  <img
                    src={aadharBackPreview || getFileUrl(currentLead.aadhar_back_pic)}
                    alt="Aadhaar Back"
                    className="w-full h-full object-cover border rounded"
                  />
                  {aadharBackPreview && (
                    <button
                      onClick={() => { setAadharBack(null); setAadharBackPreview(null); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
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
              {(panPicPreview || currentLead?.pan_pic) && (
                <div className="relative mt-2 w-32 h-24">
                  <img
                    src={panPicPreview || getFileUrl(currentLead.pan_pic)}
                    alt="PAN Card"
                    className="w-full h-full object-cover border rounded"
                  />
                  {panPicPreview && (
                    <button
                      onClick={() => { setPanPic(null); setPanPicPreview(null); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // View Mode → Show only images
          <div className="flex gap-6">
            {/* Aadhaar Front */}
            {currentLead?.aadhar_front_pic && (
              <div className="text-center">
                <img
                  src={getFileUrl(currentLead.aadhar_front_pic)}
                  alt="Aadhaar Front"
                  className="w-32 h-24 object-cover border rounded"
                />
                <p className="mt-2 text-sm font-medium text-gray-700">Aadhaar Front</p>
              </div>
            )}

            {/* Aadhaar Back */}
            {currentLead?.aadhar_back_pic && (
              <div className="text-center">
                <img
                  src={getFileUrl(currentLead.aadhar_back_pic)}
                  alt="Aadhaar Back"
                  className="w-32 h-24 object-cover border rounded"
                />
                <p className="mt-2 text-sm font-medium text-gray-700">Aadhaar Back</p>
              </div>
            )}

            {/* PAN Card */}
            {currentLead?.pan_pic && (
              <div className="text-center">
                <img
                  src={getFileUrl(currentLead.pan_pic)}
                  alt="PAN Card"
                  className="w-32 h-24 object-cover border rounded"
                />
                <p className="mt-2 text-sm font-medium text-gray-700">PAN Card</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Professional & Documentation */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Briefcase className="mr-2 text-purple-500" size={20} />
          Professional & Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {professionalFields.map((field) => (
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
    </div>
  );
};

// ==============================================