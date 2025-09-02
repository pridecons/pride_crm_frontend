"use client";

import { useState, useEffect, useMemo } from "react";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";
import { X, Loader2, Check, Edit, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const INPUT_CLS =
  "w-full h-11 px-3 border rounded-xl bg-white text-gray-900 placeholder-gray-400";

const dmyToDate = (s) => {
  if (!s) return null;
  const [dd, mm, yyyy] = s.split("-").map((v) => parseInt(v, 10));
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1);
  return isNaN(d.getTime()) ? null : d;
};
const dateToDMY = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
const toISOorUndefined = (ddmmyyyy) => {
  if (!ddmmyyyy) return undefined;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(ddmmyyyy)) return undefined;
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
};

const roleKey = (r) => (r || "").toString().toUpperCase().replace(/\s+/g, "");
const getRoleKeySafe = (currentUser) => {
  let role = currentUser?.role;
  if (!role) {
    try {
      const raw = Cookies.get("user_info");
      if (raw) {
        const p = JSON.parse(raw);
        role = p?.role ?? p?.user?.role ?? p?.user_info?.role;
      }
    } catch {}
  }
  return roleKey(role);
};

export default function UserModal({
  mode = "add",
  isOpen,
  onClose,
  user = {},
  onSuccess,
}) {
  const isEdit = mode === "edit";
  const { currentUser } = usePermissions();
  const currentRoleKey = getRoleKeySafe(currentUser);

  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{6,}$/;

  // ----- Branches (fetched), Departments, Profiles -----
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [profiles, setProfiles] = useState([]); // from /profile-role/
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Senior (users) options
  const [seniorOptions, setSeniorOptions] = useState([]);

  // Permissions selection
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // PAN & form state
  const [loadingPan, setLoadingPan] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const [formData, setFormData] = useState({
    // identity
    name: "",
    email: "",
    phone_number: "",
    father_name: "",
    password: "",
    // KYC
    pan: "",
    aadhaar: "",
    // address
    address: "",
    city: "",
    state: "",
    pincode: "",
    comment: "",
    // meta
    experience: "",
    date_of_joining: "",
    date_of_birth: "",
    // org
    branch_id: "",
    // optional supervisor/telephony
    senior_profile_id: "",
    vbc_extension_id: "",
    vbc_user_username: "",
    vbc_user_password: "",
  });

  // ---- Derived ----
  const selectedDepartment = useMemo(
    () =>
      departments.find((d) => String(d.id) === String(selectedDepartmentId)),
    [departments, selectedDepartmentId]
  );
  const departmentPermissions = selectedDepartment?.available_permissions || [];

  const filteredProfilesForDepartment = useMemo(() => {
    const depId = String(selectedDepartmentId || "");
    if (!depId) return [];
    return profiles.filter((p) => String(p.department_id) === depId);
  }, [profiles, selectedDepartmentId]);

  const selectedProfile = useMemo(
    () =>
      filteredProfilesForDepartment.find(
        (p) => String(p.id) === String(selectedProfileId)
      ),
    [filteredProfilesForDepartment, selectedProfileId]
  );

  // Map role_id -> profile/role object (to show role name in senior dropdown)
  const profileById = useMemo(() => {
    const map = {};
    for (const p of profiles) map[String(p.id)] = p;
    return map;
  }, [profiles]);

  // ---- Fetch branches / deps / profiles on open ----
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [branchRes, depRes, profRes] = await Promise.all([
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/departments/?skip=0&limit=50&order_by=name"),
          axiosInstance.get(
            "/profile-role/?skip=0&limit=50&order_by=hierarchy_level"
          ),
        ]);
        setBranches(branchRes.data || []);
        setDepartments(depRes.data || []);
        setProfiles(profRes.data || []);

        // branch preselect rules
        if (isEdit && user?.branch_id) {
          setSelectedBranchId(String(user.branch_id));
        } else if (currentRoleKey !== "SUPERADMIN") {
          const eff =
            currentUser?.branch_id ??
            (() => {
              try {
                const raw = Cookies.get("user_info");
                if (!raw) return "";
                const p = JSON.parse(raw);
                return (
                  p?.branch_id ?? p?.user?.branch_id ?? p?.user_info?.branch_id
                );
              } catch {
                return "";
              }
            })();
          if (eff) setSelectedBranchId(String(eff));
        }

        // If editing, pre-select department/profile by role_id
        if (isEdit && user?.role_id) {
          const foundProfile = (profRes.data || []).find(
            (p) => String(p.id) === String(user.role_id)
          );
          if (foundProfile) {
            setSelectedDepartmentId(String(foundProfile.department_id));
            setSelectedProfileId(String(foundProfile.id));
            setSelectedPermissions(
              user?.permissions?.length
                ? user.permissions
                : foundProfile.default_permissions || []
            );
          }
        }
      } catch(err) {
        ErrorHandling({ error: err, defaultError: "Failed to load branches/departments/roles" });
      }
    })();
  }, [isOpen, isEdit, user, currentRoleKey, currentUser]);

  // Keep formData.branch_id in sync with selectedBranchId
  useEffect(() => {
    if (!selectedBranchId) return;
    setFormData((p) => ({ ...p, branch_id: selectedBranchId }));
  }, [selectedBranchId]);

  // Reset profile and permissions when department changes
  useEffect(() => {
    if (!selectedDepartmentId) {
      setSelectedProfileId("");
      setSelectedPermissions([]);
      return;
    }
    setSelectedProfileId("");
    setSelectedPermissions([]);
  }, [selectedDepartmentId]);

  // When profile changes, preselect its default permissions
  useEffect(() => {
    if (!selectedProfile) {
      setSelectedPermissions([]);
      return;
    }
    setSelectedPermissions(selectedProfile.default_permissions || []);
  }, [selectedProfile]);

  // 🔁 Clear selected senior whenever branch changes (to avoid cross-branch senior)
  useEffect(() => {
    setFormData((p) => ({ ...p, senior_profile_id: "" }));
  }, [selectedBranchId]);

  // 🔎 Load senior options (users) — re-fetch when branch changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchSeniors = async () => {
      try {
        if (!selectedBranchId) {
          setSeniorOptions([]);
          return;
        }
        const q =
          `/users/?skip=0&limit=500&active_only=true&branch_id=${encodeURIComponent(
            selectedBranchId
          )}`;

        const res = await axiosInstance.get(q);
        const raw = res?.data?.data || [];

        // Exclude self when editing; sort by role_id then by name
        const cleaned = raw
          .filter(
            (u) => !isEdit || u.employee_code !== user?.employee_code
          )
          .sort((a, b) => {
            const ra = String(a.role_id || "");
            const rb = String(b.role_id || "");
            if (ra !== rb) return ra.localeCompare(rb);
            return String(a.name || "").localeCompare(String(b.name || ""));
          });

        setSeniorOptions(cleaned);
      } catch {
        setSeniorOptions([]);
      }
    };

    fetchSeniors();
  }, [isOpen, selectedBranchId, isEdit, user?.employee_code]);

  // Initialize / reset form values on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && user?.employee_code) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone_number: user.phone_number || "",
        father_name: user.father_name || "",
        pan: user.pan || "",
        aadhaar: user.aadhaar || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        pincode: user.pincode || "",
        comment: user.comment || "",
        experience: user.experience?.toString() || "",
        date_of_joining: user.date_of_joining
          ? dateToDMY(new Date(user.date_of_joining))
          : "",
        date_of_birth: user.date_of_birth
          ? dateToDMY(new Date(user.date_of_birth))
          : "",
        branch_id: user.branch_id?.toString() || "",
        senior_profile_id: user.senior_profile_id || "",
        vbc_extension_id: user.vbc_extension_id || "",
        vbc_user_username: user.vbc_user_username || "",
        vbc_user_password: user.vbc_user_password || "",
      });
      setIsPanVerified(!!user.pan);
    } else {
      setFormData({
        name: "",
        email: "",
        phone_number: "",
        father_name: "",
        password: "",
        pan: "",
        aadhaar: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        comment: "",
        experience: "",
        date_of_joining: "",
        date_of_birth: "",
        branch_id: "",
        senior_profile_id: "",
        vbc_extension_id: "",
        vbc_user_username: "",
        vbc_user_password: "",
      });
      setIsPanVerified(false);
    }
  }, [isOpen, isEdit, user]);

  // -------- PAN input sanitization ----------
  const sanitizePAN = (input) => {
    const raw = (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    let out = "";
    for (let i = 0; i < raw.length && out.length < 10; i++) {
      const idx = out.length; // target position
      const ch = raw[i];
      if ((idx <= 4 || idx === 9) && /[A-Z]/.test(ch)) {
        out += ch;
      } else if (idx >= 5 && idx <= 8 && /[0-9]/.test(ch)) {
        out += ch;
      }
    }
    return out;
  };

  // -------- PAN verification ----------
  const handleVerifyPan = async () => {
    if (!formData.pan) return ErrorHandling({ defaultError: "Enter a PAN first" });
    if (formData.pan.trim().length !== 10 || !PAN_REGEX.test(formData.pan))
      return ErrorHandling({ defaultError: "Enter a valid PAN (e.g., ABCDE1234F)"});

    setLoadingPan(true);
    toast.loading("Verifying PAN...");
    try {
      const res = await axiosInstance.post(
        "/micro-pan-verification",
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      toast.dismiss();
      if (res.data.success && res.data.data?.result) {
        const r = res.data.data.result;
        setFormData((p) => ({
          ...p,
          name: r.user_full_name || p.name,
          father_name: r.user_father_name || p.father_name,
          date_of_birth: r.user_dob || p.date_of_birth,
          aadhaar: r.masked_aadhaar || p.aadhaar,
          address: r.user_address?.full || p.address,
          city: r.user_address?.city || p.city,
          state: r.user_address?.state || p.state,
          pincode: r.user_address?.zip || p.pincode,
        }));
        setIsPanVerified(true);
        toast.success("PAN verified!");
      } else {
        ErrorHandling({ defaultError: "PAN verification failed"});
      }
    } catch(err) {
      toast.dismiss();
       ErrorHandling({error: err, defaultError: "Error verifying PAN"});
    } finally {
      setLoadingPan(false);
    }
  };

  // -------- Permissions toggling ----------
  const togglePermission = (perm) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const aadhaarError =
    formData.aadhaar.length > 0 &&
    !(/^\d{12}$/.test(formData.aadhaar) || /^[Xx]{8}\d{4}$/.test(formData.aadhaar))
      ? "Enter 12 digits or masked like XXXXXXXX1234"
      : "";
  const phoneError =
    formData.phone_number.length > 0 && formData.phone_number.length !== 10
      ? "Must be 10 digits"
      : "";
  const passwordError =
    formData.password.length > 0 && !passwordRegex.test(formData.password)
      ? "Password must be ≥6 chars with a number & special char"
      : "";

  // -------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Flow validations
    if (!selectedBranchId) return toast.error("Please select a Branch first");
    if (!selectedDepartmentId)
      return toast.error("Please select a Department");
    if (!selectedProfileId) return toast.error("Please select a Profile");

    // Basic required fields
    if (!formData.name.trim()) return toast.error("Full Name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!formData.phone_number.trim())
      return toast.error("Phone number is required");

    // PAN checks
    if (!formData.pan.trim()) return toast.error("PAN is required");
    if (formData.pan.trim().length !== 10)
      return toast.error("PAN must be 10 characters");
    if (!PAN_REGEX.test(formData.pan.trim()))
      return toast.error("Enter a valid PAN (e.g., ABCDE1234F)");

    // Aadhaar validation
    if (formData.aadhaar && aadhaarError) return toast.error(aadhaarError);

    // Phone validation
    if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number))
    return  ErrorHandling({defaultError: "Phone must be 10 digits"});

    // Password validation
    if (!isEdit && !passwordRegex.test(formData.password)) {
      return  ErrorHandling({defaultError: "Password must be ≥6 chars, include a number & special char"});
    }
    if (isEdit && formData.password && !passwordRegex.test(formData.password)) {
      return  ErrorHandling({defaultError: "Password must be ≥6 chars, include a number & special char"});
    }

    // Build payload
    const payload = {
      phone_number: formData.phone_number,
      email: formData.email,
      name: formData.name,
      father_name: formData.father_name || undefined,
      is_active: true,
      experience: Number(formData.experience) || 0,
      date_of_joining: toISOorUndefined(formData.date_of_joining),
      date_of_birth: toISOorUndefined(formData.date_of_birth),
      pan: formData.pan,
      aadhaar: formData.aadhaar || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      pincode: formData.pincode || undefined,
      comment: formData.comment || undefined,

      // ORG
      branch_id: Number(selectedBranchId) || undefined,

      // IMPORTANT: role_id not role name
      role_id: String(selectedProfileId),

      // Permissions
      permissions: selectedPermissions || [],

      // Optional supervisor/telephony
      senior_profile_id: formData.senior_profile_id || undefined,
      vbc_extension_id: formData.vbc_extension_id || undefined,
      vbc_user_username: formData.vbc_user_username || undefined,
      vbc_user_password: formData.vbc_user_password || undefined,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });

    setIsSubmitting(true);
    toast.loading(isEdit ? "Updating…" : "Adding user…");
    try {
      let res;
      if (isEdit) {
        if (formData.password) payload.password = formData.password;
        res = await axiosInstance.put(`/users/${user.employee_code}`, payload);
      } else {
        res = await axiosInstance.post("/users/", {
          ...payload,
          password: formData.password,
        });
      }

      toast.dismiss();
      toast.success(isEdit ? "Updated!" : "Added!");
      onSuccess?.(res.data);
      onClose?.();
    } catch (error) {
      // toast.dismiss();
      // const detail = error?.response?.data?.detail;
      // const msg = Array.isArray(detail?.errors)
      //   ? detail.errors.join(", ")
      //   : detail?.errors || detail?.message || detail || "Request failed";
      // toast.error(msg);
      ErrorHandling({error: error, defaultError: "Array.isArray(detail?.errors)"});
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <Edit className="w-6 h-6 text-gray-700" />
            ) : (
              <Check className="w-6 h-6 text-green-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? `Edit User: ${user.employee_code}` : "Add New User"}
            </h2>
          </div>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {/* === Step 1: Branch (first), then Department & Profile === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Branch */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch *
                </label>
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  required
                  disabled={currentRoleKey !== "SUPERADMIN" && !!selectedBranchId}
                  title={
                    currentRoleKey !== "SUPERADMIN"
                      ? "Branch is fixed for your role"
                      : undefined
                  }
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  required
                  disabled={!selectedBranchId}
                  title={!selectedBranchId ? "Select Branch first" : undefined}
                >
                  <option value="">
                    {selectedBranchId ? "Select Department" : "Select Branch first"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile / Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile (Role) *
                </label>
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  required
                  disabled={!selectedDepartmentId}
                >
                  <option value="">
                    {selectedDepartmentId
                      ? "Select Profile"
                      : "Select Department first"}
                  </option>
                  {filteredProfilesForDepartment.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedProfile && (
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedProfile.description}
                  </p>
                )}
              </div>
            </div>

            {/* === Step 2: Identity & Org === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>

                {/* PAN (with slot-based input enforcement) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number *
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      className="flex-1 p-3 border rounded-xl uppercase"
                      value={formData.pan}
                      onChange={(e) =>
                        setFormData({ ...formData, pan: sanitizePAN(e.target.value) })
                      }
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      disabled={loadingPan || isPanVerified}
                    />
                    {isPanVerified ? (
                      <>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
                          <Check className="w-4 h-4 text-white" />
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsPanVerified(false)}
                          className="p-2 rounded-lg hover:bg-yellow-200 text-yellow-600 flex items-center"
                          title="Edit PAN"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyPan}
                        disabled={loadingPan}
                        className="px-4 py-2 rounded-lg flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {loadingPan ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Verify
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    className="w-full p-3 border rounded-xl"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={isPanVerified}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    className="w-full p-3 border rounded-xl"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  {phoneError && (
                    <div className="mb-1 text-xs text-red-600 font-medium">
                      {phoneError}
                    </div>
                  )}
                  <input
                    className="w-full p-3 border rounded-xl"
                    maxLength={10}
                    value={formData.phone_number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        phone_number: digits.slice(0, 10),
                      });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    className="w-full p-3 border rounded-xl"
                    value={formData.father_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        father_name: e.target.value,
                      })
                    }
                    disabled={isPanVerified}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEdit ? "Reset Password" : "Password *"}
                  </label>
                  {isEdit && (
                    <p className="text-xs text-gray-500 mb-1">
                      Leave blank to keep existing password.
                    </p>
                  )}
                  {passwordError && (
                    <div
                      id="pwd-error"
                      className="mb-1 text-xs text-red-600 font-medium"
                    >
                      {passwordError}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      className="w-full p-3 border rounded-xl pr-10 bg-white text-gray-900 placeholder-gray-400 caret-gray-700"
                      type={showPwd ? "text" : "password"}
                      value={formData.password ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      autoComplete="new-password"
                      required={!isEdit}
                      placeholder={
                        isEdit ? "Enter new password" : "Create a password"
                      }
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "pwd-error" : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">
                  Organization & Docs
                </h4>

                {/* Aadhaar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Number
                  </label>
                  {aadhaarError && (
                    <div className="mb-1 text-xs text-red-600 font-medium">
                      {aadhaarError}
                    </div>
                  )}
                  <input
                    className="w-full p-3 border rounded-xl"
                    maxLength={12}
                    value={formData.aadhaar}
                    onChange={(e) => {
                      const clean = e.target.value
                        .replace(/[^0-9xX]/g, "")
                        .toUpperCase()
                        .slice(0, 12);
                      setFormData({ ...formData, aadhaar: clean });
                    }}
                    disabled={isPanVerified}
                  />
                </div>

                {/* Senior (from /users) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting Profile
                  </label>
                  <select
                    className="w-full p-3 border rounded-xl bg-white"
                    value={formData.senior_profile_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        senior_profile_id: e.target.value,
                      })
                    }
                    disabled={!selectedBranchId}
                    title={!selectedBranchId ? "Select Branch first" : undefined}
                  >
                    <option value="">
                      {selectedBranchId ? "Select Reporting Profile" : "Select Branch first"}
                    </option>
                    {seniorOptions.map((u) => {
                      const roleLabel =
                        profileById[String(u.role_id)]?.name ||
                        `Role ${u.role_id}`;
                      return (
                        <option key={u.employee_code} value={u.employee_code}>
                          {roleLabel} → {u.name} ({u.employee_code})
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    List shows all active users from the selected branch.
                  </p>
                </div>

                {/* VBC fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VBC Extension ID
                    </label>
                    <input
                      className="w-full p-3 border rounded-xl"
                      value={formData.vbc_extension_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vbc_extension_id: e.target.value,
                        })
                      }
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VBC Username
                    </label>
                    <input
                      className="w-full p-3 border rounded-xl"
                      value={formData.vbc_user_username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vbc_user_username: e.target.value,
                        })
                      }
                      placeholder="VBC username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VBC Password
                    </label>
                    <input
                      className="w-full p-3 border rounded-xl"
                      value={formData.vbc_user_password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vbc_user_password: e.target.value,
                        })
                      }
                      placeholder="VBC password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Address Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                    <input
                      className="p-3 border rounded-xl w-full"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    className="p-3 border rounded-xl w-full"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    className="p-3 border rounded-xl w-full"
                    value={formData.pincode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, pincode: digits });
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complete Address
                </label>
                <textarea
                  className="w-full p-3 border rounded-xl resize-none"
                  rows="3"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Additional Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining (DD-MM-YYYY)
                  </label>
                  <DatePicker
                    selected={dmyToDate(formData.date_of_joining)}
                    onChange={(date) =>
                      setFormData((p) => ({
                        ...p,
                        date_of_joining: dateToDMY(date),
                      }))
                    }
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className={INPUT_CLS}
                    isClearable
                    showPopperArrow={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth (DD-MM-YYYY)
                  </label>
                  <DatePicker
                    selected={dmyToDate(formData.date_of_birth)}
                    onChange={(date) =>
                      setFormData((p) => ({
                        ...p,
                        date_of_birth: dateToDMY(date),
                      }))
                    }
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className={`${INPUT_CLS} ${
                      isPanVerified ? "opacity-80 pointer-events-none bg-gray-50" : ""
                    }`}
                    isClearable
                    showPopperArrow={false}
                    disabled={isPanVerified}
                    title={
                      isPanVerified ? "DOB is locked after PAN verification" : undefined
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience (Years)
                </label>
                <input
                  className={INPUT_CLS}
                  type="number"
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({ ...formData, experience: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-xl resize-none"
                  rows="3"
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                />
              </div>
            </div>

            {/* === Permissions === */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Permissions</h4>
              {!selectedDepartmentId && (
                <p className="text-sm text-gray-500">
                  Select a Department to load permissions.
                </p>
              )}

              {selectedDepartmentId && (
                <>
                  <p className="text-xs text-gray-500">
                    Preselected from profile defaults; remaining department
                    permissions are unchecked by default.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {departmentPermissions.map((perm) => {
                      const checked = selectedPermissions.includes(perm);
                      return (
                        <label
                          key={perm}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => togglePermission(perm)}
                          />
                          <span className="text-sm text-gray-800 break-all">
                            {perm}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-4 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {isEdit ? "Updating" : "Saving"}…
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> {isEdit ? "Update User" : "Save User"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
