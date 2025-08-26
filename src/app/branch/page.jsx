"use client";

import React, { useEffect, useState, Fragment, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { Dialog, Transition } from "@headlessui/react";
import LoadingState from "@/components/LoadingState";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import { Loader2, Check, Edit } from "lucide-react";

// ---- helpers ---------------------------------------------------------------
const emptyManager = {
  manager_name: "",
  manager_email: "",
  manager_phone: "",
  manager_aadhaar: "",
  manager_pan: "",
  manager_password: "",
  manager_father_name: "",
  manager_city: "",
  manager_state: "",
  manager_address: "",
  manager_pincode: "",
  manager_experience: "",
  manager_comment: "",
  manager_dob: "",
};

const emptyBranch = {
  branch_name: "",
  branch_address: "",
  agreement_pdf: null, // required on create
  branch_active: true,
  ...emptyManager,
};

// Aadhaar helpers
const isValidMaskedAadhaar = (v = "") =>
  /^\d{12}$/.test(v) || /^[Xx]{8}\d{4}$/.test(v);

const toMaskedAadhaarInput = (v = "") =>
  v?.toString()?.replace(/[^0-9xX]/g, "").toUpperCase().slice(0, 12);

// DOB helpers
const normalizeDob = (raw = "") => {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const [, mm2, dd2, yyyy2] = m;
    return `${yyyy2}-${mm2}-${dd2}`;
  }
  return s;
};
const isoToDDMMYYYY = (iso = "") => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
};
const allowDobInput = (s = "") => s.replace(/[^0-9/]/g, "").slice(0, 10);

// validations ---------------------------------------------------------------
const isValidEmail = (s = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const isValidPhone10 = (s = "") =>
  s.replace(/\D/g, "").length === 10;

const isValidPincode = (s = "") =>
  /^\d{6}$/.test(String(s).trim());

const isPositiveNumber = (s = "") =>
  /^\d+(\.\d+)?$/.test(String(s).trim());

// Component -----------------------------------------------------------------
const BranchesPage = () => {
  const { hasPermission } = usePermissions();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [isOpen, setIsOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [formData, setFormData] = useState(emptyBranch);

  // Branch details modal
  const [showDetails, setShowDetails] = useState(false);
  const [branchDetails, setBranchDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Agreement viewer
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementUrl, setAgreementUrl] = useState("");

  // Manager PAN verification
  const [loadingManagerPan, setLoadingManagerPan] = useState(false);
  const [isManagerPanVerified, setIsManagerPanVerified] = useState(false);

  const BACKEND_URL = "https://crm.24x7techelp.com";
  const fileInputRef = useRef(null);

  const openAgreementModal = (url) => {
    let absoluteUrl = url;
    if (url && url.startsWith("/")) absoluteUrl = BACKEND_URL + url;
    setAgreementUrl(absoluteUrl);
    setShowAgreement(true);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      setBranches(data);
    } catch (error) {
      toast.error("Failed to fetch branches");
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setEditBranch(null);
    setFormData(emptyBranch);
    setIsOpen(true);
    setIsManagerPanVerified(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditModal = (branch) => {
    setEditBranch(branch);
    setFormData({
      ...emptyBranch,
      branch_name: branch.name || "",
      branch_address: branch.address || "",
      agreement_pdf: null, // optional on edit unless you want to force re-upload
      branch_active: branch.active,
      // NOTE: Prefill manager fields here if API returns them in details endpoint
    });
    setIsManagerPanVerified(false);
    setIsOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openDetails = async (branchId) => {
    setBranchDetails(null);
    setDetailsLoading(true);
    setShowDetails(true);
    try {
      const { data } = await axiosInstance.get(`/branches/${branchId}/details`);
      setBranchDetails(data);
    } catch (e) {
      toast.error("Failed to fetch branch details");
    }
    setDetailsLoading(false);
  };

  // handlers ----------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setFormData((p) => ({ ...p, agreement_pdf: null }));
      return;
    }
    // validations: pdf only and <= 10MB
    const maxSize = 10 * 1024 * 1024;
    const isPDF =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      toast.error("Agreement must be a PDF file");
      e.target.value = "";
      setFormData((p) => ({ ...p, agreement_pdf: null }));
      return;
    }
    if (file.size > maxSize) {
      toast.error("Agreement PDF too large (max 10MB)");
      e.target.value = "";
      setFormData((p) => ({ ...p, agreement_pdf: null }));
      return;
    }
    setFormData((prev) => ({ ...prev, agreement_pdf: file }));
  };

  const validateBeforeSubmit = () => {
    // Branch validations
    if (!formData.branch_name.trim()) {
      toast.error("Branch name is required");
      return false;
    }
    if (!formData.branch_address.trim()) {
      toast.error("Branch address is required");
      return false;
    }
    if (!editBranch && !formData.agreement_pdf) {
      toast.error("Agreement PDF is required");
      return false;
    }

    // Manager validations
    if (!formData.manager_name.trim()) {
      toast.error("Manager name is required");
      return false;
    }
    if (!formData.manager_email.trim() || !isValidEmail(formData.manager_email)) {
      toast.error("Enter a valid manager email");
      return false;
    }
    if (!isValidPhone10(formData.manager_phone)) {
      toast.error("Manager phone must be 10 digits");
      return false;
    }
    if (!formData.manager_password || formData.manager_password.length < 6) {
      toast.error("Manager password must be at least 6 characters");
      return false;
    }
    if (!isValidMaskedAadhaar(formData.manager_aadhaar)) {
      toast.error("Manager Aadhaar must be 12 digits or masked like XXXXXXXX1234");
      return false;
    }
    if (!formData.manager_pan.trim()) {
      toast.error("Manager PAN is required");
      return false;
    }
    if (!formData.manager_father_name.trim()) {
      toast.error("Father's name is required");
      return false;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.manager_dob || "")) {
      toast.error("DOB must be in DD/MM/YYYY format");
      return false;
    }
    if (!formData.manager_city.trim()) {
      toast.error("City is required");
      return false;
    }
    if (!formData.manager_state.trim()) {
      toast.error("State is required");
      return false;
    }
    if (!isValidPincode(formData.manager_pincode)) {
      toast.error("Pincode must be 6 digits");
      return false;
    }
    if (!isPositiveNumber(formData.manager_experience)) {
      toast.error("Experience must be a valid number");
      return false;
    }
    if (!formData.manager_address.trim()) {
      toast.error("Manager address is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateBeforeSubmit()) return;

  const dobISO = normalizeDob(formData.manager_dob);
  const data = new FormData();

  // ✅ Map manager details to top-level branch fields
  data.append("authorized_person", formData.manager_name);
  data.append("branch_pan", formData.manager_pan);
  data.append("branch_aadhaar", formData.manager_aadhaar);

  // append all other fields
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      data.append(key, key === "manager_dob" ? dobISO : value);
    }
  });

  try {
    if (editBranch) {
      await axiosInstance.put(`/branches/${editBranch.id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Branch updated successfully");
    } else {
      await axiosInstance.post(`/branches/create-with-manager`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Branch created successfully");
    }
    setIsOpen(false);
    fetchBranches();
  } catch (error) {

    const detail = error?.response?.data?.detail;
    const msg =
      Array.isArray(detail?.errors)
        ? detail.errors.join(", ")
        : detail?.errors || detail?.message || "Error saving branch";
    toast.error(String(msg));
  }
};

  const handleVerifyManagerPan = async () => {
    const pan = (formData.manager_pan || "").toUpperCase().trim();
    if (!pan) return toast.error("Enter Manager PAN first");

    setLoadingManagerPan(true);
    const tId = toast.loading("Verifying PAN...");
    try {
      const res = await axiosInstance.post(
        "/micro-pan-verification",
        new URLSearchParams({ pannumber: pan }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      toast.dismiss(tId);
      if (res.data?.success && res.data?.data?.result) {
        const r = res.data.data.result;
        setFormData((prev) => ({
          ...prev,
          manager_name: r.user_full_name || prev.manager_name,
          manager_father_name: r.user_father_name || prev.manager_father_name,
          manager_dob: isoToDDMMYYYY(normalizeDob(r.user_dob)) || prev.manager_dob,
          manager_aadhaar: r.masked_aadhaar || prev.manager_aadhaar,
          manager_address: r.user_address?.full || prev.manager_address,
          manager_city: r.user_address?.city || prev.manager_city,
          manager_state: r.user_address?.state || prev.manager_state,
          manager_pincode: r.user_address?.zip || prev.manager_pincode,
          manager_pan: pan,
        }));
        setIsManagerPanVerified(true);
        toast.success("Manager PAN verified!");
      } else {
        toast.error("PAN verification failed");
      }
    } catch {
      toast.dismiss(tId);
      toast.error("Error verifying PAN");
    } finally {
      setLoadingManagerPan(false);
    }
  };

  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-end mb-6">
          {hasPermission("branch_add") && (
            <button
              className="inline-flex items-center px-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={openAddModal}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12">
              <LoadingState message="Loading branches..." />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No branches found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first branch</p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add First Branch
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Branch Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Agreement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branches.map((branch, index) => (
                    <tr key={branch.id} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          #{String(branch.id).padStart(3, "0")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{branch.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {branch.active ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openAgreementModal(branch.agreement_url)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          type="button"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {hasPermission("branch_edit") && (
                            <button
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors duration-200"
                              onClick={() => openEditModal(branch)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          )}
                          {hasPermission("branch_details") && (
                            <button
                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                              onClick={() => openDetails(branch.id)}
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-start bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                  <div>
                    <Dialog.Title className="text-2xl font-bold text-white flex items-center">
                      <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {editBranch ? "Edit Branch" : "Add New Branch With Manager"}
                    </Dialog.Title>
                    <p className="text-blue-100 mt-2">
                      Fill in the details below to {editBranch ? "update" : "create"} a branch
                    </p>
                  </div>

                  <button type="button" onClick={() => setIsOpen(false)}>
                    <svg className="w-5 h-5 text-white-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Branch Information */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Branch Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
                          <input
                            name="branch_name"
                            value={formData.branch_name}
                            onChange={handleChange}
                            placeholder="Enter branch name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Branch Address *</label>
                          <textarea
                            name="branch_address"
                            value={formData.branch_address}
                            onChange={handleChange}
                            placeholder="Enter complete branch address"
                            rows="3"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Agreement PDF *</label>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Upload a valid PDF file (max 10MB). Required when creating a branch.
                          </p>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="branch_active"
                            checked={!!formData.branch_active}
                            onChange={handleChange}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-3 text-sm font-medium text-gray-700">Branch Active</label>
                        </div>
                      </div>
                    </div>

                    {/* Manager Information */}
                    <div className="bg-indigo-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Branch Manager Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager PAN *</label>
                          <div className="flex gap-2 items-center">
                            <input
                              name="manager_pan"
                              value={(formData.manager_pan || "").toUpperCase()}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  manager_pan: e.target.value.toUpperCase(),
                                }))
                              }
                              placeholder="ABCDE1234F"
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                              required
                              disabled={loadingManagerPan || isManagerPanVerified}
                            />

                            {isManagerPanVerified ? (
                              <>
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600">
                                  <Check className="w-5 h-5 text-white" />
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsManagerPanVerified(false)}
                                  className="p-2 rounded-lg hover:bg-yellow-200 text-yellow-700"
                                  title="Edit PAN"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={handleVerifyManagerPan}
                                disabled={loadingManagerPan}
                                className="px-4 py-2 rounded-lg flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {loadingManagerPan ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Verify
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name *</label>
                          <input
                            name="manager_name"
                            value={formData.manager_name}
                            onChange={handleChange}
                            placeholder="Enter manager name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                            disabled={isManagerPanVerified}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager Email *</label>
                          <input
                            name="manager_email"
                            value={formData.manager_email}
                            onChange={handleChange}
                            placeholder="Enter manager email"
                            type="email"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager Phone *</label>
                          <input
                            name="manager_phone"
                            value={formData.manager_phone}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setFormData((prev) => ({ ...prev, manager_phone: digits }));
                            }}
                            placeholder="Enter manager phone number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager Password *</label>
                          <input
                            name="manager_password"
                            value={formData.manager_password}
                            onChange={handleChange}
                            placeholder="Enter manager password"
                            type="password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Manager Aadhaar *</label>
                            {formData.manager_aadhaar &&
                              !isValidMaskedAadhaar(formData.manager_aadhaar) && (
                                <span className="text-xs text-red-600">
                                  Use 12 digits or XXXXXXXX1234
                                </span>
                              )}
                          </div>
                          <input
                            name="manager_aadhaar"
                            value={formData.manager_aadhaar}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                manager_aadhaar: toMaskedAadhaarInput(e.target.value),
                              }))
                            }
                            placeholder="12 digits or masked XXXXXXXX1234"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                            disabled={isManagerPanVerified}
                          />
                        </div>


                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name *</label>
                          <input
                            name="manager_father_name"
                            value={formData.manager_father_name}
                            onChange={handleChange}
                            placeholder="Enter father's name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                            disabled={isManagerPanVerified}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                          <input
                            name="manager_dob"
                            value={formData.manager_dob}
                            onChange={(e) => {
                              const next = allowDobInput(e.target.value);
                              const digits = next.replace(/\//g, "");
                              let pretty = digits;
                              if (digits.length > 4)
                                pretty = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
                              else if (digits.length > 2)
                                pretty = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
                              setFormData((p) => ({ ...p, manager_dob: pretty }));
                            }}
                            placeholder="DD/MM/YYYY"
                            inputMode="numeric"
                            type="text"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                            disabled={isManagerPanVerified}
                          />
                          {formData.manager_dob &&
                            !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.manager_dob) && (
                              <span className="text-xs text-red-600">Use DD/MM/YYYY</span>
                            )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                          <input
                            name="manager_city"
                            value={formData.manager_city}
                            onChange={handleChange}
                            placeholder="Enter city"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                          <input
                            name="manager_state"
                            value={formData.manager_state}
                            onChange={handleChange}
                            placeholder="Enter state"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                          <input
                            name="manager_pincode"
                            value={formData.manager_pincode}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                              setFormData((prev) => ({ ...prev, manager_pincode: digits }));
                            }}
                            placeholder="6-digit pincode"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years) *</label>
                          <input
                            name="manager_experience"
                            value={formData.manager_experience}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                manager_experience: e.target.value.replace(/[^0-9.]/g, ""),
                              }))
                            }
                            placeholder="e.g. 3"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                          <textarea
                            name="manager_address"
                            value={formData.manager_address}
                            onChange={handleChange}
                            placeholder="Enter complete address"
                            rows="3"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                          <textarea
                            name="manager_comment"
                            value={formData.manager_comment}
                            onChange={handleChange}
                            placeholder="Additional comments or notes"
                            rows="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        {editBranch ? "Update Branch" : "Create Branch + Manager"}
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Details Modal */}
      <Transition appear show={showDetails} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowDetails(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-2">
                  <Dialog.Title className="text-2xl font-bold text-white flex items-center">
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Branch Details
                  </Dialog.Title>
                  <p className="text-indigo-100 mt-2">Comprehensive branch information and user management</p>
                </div>

                <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                  {detailsLoading ? (
                    <div className="text-center py-12">
                      <LoadingState message="Loading details..." />
                    </div>
                  ) : branchDetails ? (
                    <div className="space-y-8">
                      {/* Branch Information */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {branchDetails.branch.name}
                          <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                            ID: {branchDetails.branch.id}
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                            <p className="text-gray-900">{branchDetails.branch.address}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                            {branchDetails.branch.active ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                Inactive
                              </span>
                            )}
                          </div>
                          {hasPermission("branch_agreement_view") && (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-600 mb-1">Agreement</label>
                              <a
                                href={branchDetails.branch.agreement_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View Agreement PDF
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Manager Information */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Branch Manager
                        </h3>
                        {branchDetails.manager ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Manager Name</label>
                              <p className="text-gray-900 font-semibold">{branchDetails.manager.name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Employee Code</label>
                              <p className="text-gray-900 font-mono">{branchDetails.manager.employee_code}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                              <p className="text-gray-900">{branchDetails.manager.email}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                              <p className="text-gray-900">{branchDetails.manager.phone_number}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <p className="text-gray-500">No manager assigned to this branch</p>
                          </div>
                        )}
                      </div>

                      {/* Users */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                          <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Branch Users
                          <span className="ml-3 text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                            Total: {branchDetails.total_users}
                          </span>
                        </h3>
                        {branchDetails.users && branchDetails.users.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee Code</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {branchDetails.users.map((user, index) => (
                                  <tr key={user.employee_code} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm font-mono text-gray-900">{user.employee_code}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className="text-sm text-gray-600">{user.email}</span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {user.is_active ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                                          Active
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1"></div>
                                          Inactive
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <p className="text-gray-500">No users found in this branch</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.482 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Branch Not Found</h3>
                      <p className="text-gray-500">The requested branch details could not be loaded</p>
                    </div>
                  )}
                </div>

                <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-6 py-1 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Agreement Viewer */}
      <Transition appear show={showAgreement} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowAgreement(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
                  <Dialog.Title className="text-2xl font-bold text-white flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Agreement Document
                    </div>
                    <button
                      onClick={() => setShowAgreement(false)}
                      className="text-white hover:text-gray-200 transition-colors duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Dialog.Title>
                  <p className="text-orange-100 mt-2">View and review the branch agreement document</p>
                </div>

                <div className="p-6">
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[70vh]">
                    {agreementUrl ? (
                      agreementUrl.toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={agreementUrl}
                          title="Agreement PDF"
                          className="w-full h-[70vh] rounded-lg border border-gray-200 shadow-inner"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[70vh]">
                          <img
                            src={agreementUrl}
                            alt="Agreement"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                          />
                        </div>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-[70vh]">
                        <div className="text-center">
                          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.482 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h3>
                          <p className="text-gray-500">No agreement document is available for viewing</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default BranchesPage;
