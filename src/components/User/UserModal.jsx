// components/UserModal.jsx
"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { X, Loader2, Check, Edit, Eye, EyeOff } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import UserPermissionsModal from "./UserPermissionsModal";
import toast from "react-hot-toast";
import { usePermissions } from "@/context/PermissionsContext";
import dynamic from "next/dynamic";
const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const INPUT_CLS = "w-full h-11 px-3 border rounded-xl bg-white text-gray-900 placeholder-gray-400";

// Convert "DD-MM-YYYY" -> Date
const dmyToDate = (s) => {
    if (!s) return null;
    const [dd, mm, yyyy] = s.split("-").map((v) => parseInt(v, 10));
    const d = new Date(yyyy, (mm || 1) - 1, dd || 1);
    return isNaN(d.getTime()) ? null : d;
};
// Convert Date -> "DD-MM-YYYY"
const dateToDMY = (d) => {
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};

// ---- helpers ---------------------------------------------------------------
const roleKey = (r) => (r || "").toString().toUpperCase().replace(/\s+/g, "");

// get role even before context is ready (cookie fallback)
const getRoleKeySafe = (currentUser) => {
    let role = currentUser?.role;
    if (!role) {
        try {
            const raw = Cookies.get("user_info");
            if (raw) {
                const p = JSON.parse(raw);
                role = p?.role ?? p?.user?.role ?? p?.user_info?.role;
            }
        } catch { }
    }
    return roleKey(role);
};
// show branch name from id
const getBranchName = (branches = [], id) => {
    if (!id) return "";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.name || `Branch #${id}`;
};

// Compute effective branch id for non-SUPERADMIN
const getEffectiveBranchId = ({ currentUser, user, isEdit, formBranchId }) => {
    if (isEdit && user?.branch_id) return String(user.branch_id);     // 1) editing existing
    if (formBranchId) return String(formBranchId);                    // 2) already set in form
    if (currentUser?.branch_id) return String(currentUser.branch_id); // 3) from context

    // 4) cookie fallback
    try {
        const raw = Cookies.get("user_info");
        if (raw) {
            const parsed = JSON.parse(raw);
            const b =
                parsed?.branch_id ??
                parsed?.user?.branch_id ??
                parsed?.user_info?.branch_id;
            if (b) return String(b);
        }
    } catch { }
    return "";
};

export default function UserModal({
    mode = "add",
    isOpen,
    onClose,
    user = {},
    branches,
    roles,
    onSuccess,
}) {
    const isEdit = mode === "edit";
    const { currentUser } = usePermissions();
    const currentRoleKey = getRoleKeySafe(currentUser);
    const passwordRegex =
        /^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{6,}$/;

    // ---- state ----------------------------------------------------------------

    const [formData, setFormData] = useState({
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
        role: "",
        branch_id: "",
        sales_manager_id: "",
        tl_id: "",
    });
    const [loadingPan, setLoadingPan] = useState(false);
    const [isPanVerified, setIsPanVerified] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filteredRoles, setFilteredRoles] = useState([]);
    const [salesManagers, setSalesManagers] = useState([]);
    const [teamLeads, setTeamLeads] = useState([]);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [showPwd, setShowPwd] = useState(false);

    // PAN format: ABCDE1234F
    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    // Map backend field keys -> nice labels for toasts
    const FIELD_LABELS = {
        name: "Full Name",
        email: "Email",
        phone_number: "Phone number",
        father_name: "Father's Name",
        pan: "PAN",
        aadhaar: "Aadhaar",
        address: "Address",
        city: "City",
        state: "State",
        pincode: "Pincode",
        comment: "Comments",
        experience: "Experience",
        date_of_joining: "Date of Joining",
        date_of_birth: "Date of Birth",
        role: "Role",
        branch_id: "Branch",
        sales_manager_id: "Sales Manager",
        tl_id: "Team Lead",
    };

    // if "07-12-2001" -> "2001-12-07", else undefined
    const toISOorUndefined = (ddmmyyyy) => {
        if (!ddmmyyyy) return undefined;
        if (!/^\d{2}-\d{2}-\d{4}$/.test(ddmmyyyy)) return undefined;
        const [dd, mm, yyyy] = ddmmyyyy.split("-");
        return `${yyyy}-${mm}-${dd}`;
    };

    // Show readable toasts from FastAPI/Pydantic error shape
    const showApiErrors = (err) => {
        const details = err?.response?.data?.detail;
        if (Array.isArray(details) && details.length) {
            // show one toast per error item
            details.forEach((d) => {
                // last part of loc is usually the field name
                const loc = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
                const label = FIELD_LABELS[loc] || (typeof loc === "string" ? loc : "Field");
                const msg = d?.msg || "Invalid value";
                toast.error(`${label}: ${msg}`);
            });
            return true; // handled
        }
        // fallback single message
        const fallback =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Something went wrong, please try again";
        toast.error(fallback);
        return true;
    };

    // ---- utils ----------------------------------------------------------------

    const formatToISO = (ddmmyyyy) => {
        if (!ddmmyyyy) return "";
        const [dd, mm, yyyy] = ddmmyyyy.split("-");
        return `${yyyy}-${mm}-${dd}`;
    };
    const formatToDDMMYYYY = (yyyymmdd) => {
        if (!yyyymmdd) return "";
        const [yyyy, mm, dd] = yyyymmdd.split("-");
        return `${dd}-${mm}-${yyyy}`;
    };
    const handleDateChange = (field, value) => {
        if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
            setFormData((p) => ({ ...p, [field]: value }));
        }
    };
    const isValidAadhaar = (v = "") =>
        /^\d{12}$/.test(v) || /^[Xx]{8}\d{4}$/.test(v);

    // ---- effects --------------------------------------------------------------

    // Initialize form when opening
    useEffect(() => {
        if (!isOpen) return;

        if (isEdit && user.employee_code) {
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
                    ? formatToDDMMYYYY(user.date_of_joining)
                    : "",
                date_of_birth: user.date_of_birth
                    ? formatToDDMMYYYY(user.date_of_birth)
                    : "",
                role: user.role || "",
                branch_id: user.branch_id?.toString() || "",
                sales_manager_id: user.sales_manager_id || "",
                tl_id: user.tl_id || "",
            });
            setIsPanVerified(true);
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
                role: "",
                branch_id: "",
                sales_manager_id: "",
                tl_id: "",
            });
            setIsPanVerified(false);
        }
    }, [isOpen, isEdit, user]);

    // Ensure non-SUPERADMIN always gets a branch_id (context + cookie fallback)
    useEffect(() => {
        if (!isOpen) return;
        if (currentRoleKey === "SUPERADMIN") return;

        const eff = getEffectiveBranchId({
            currentUser,
            user,
            isEdit,
            formBranchId: formData.branch_id,
        });

        if (eff && formData.branch_id !== eff) {
            setFormData((p) => ({ ...p, branch_id: eff }));
        }
    }, [isOpen, currentRoleKey, currentUser, isEdit, user, formData.branch_id]);

    // Filter roles by currentUser’s role (normalize)
    useEffect(() => {
        if (!roles?.length || !currentUser) return;
        let allowed = [];
        switch (currentRoleKey) {
            case "SUPERADMIN":
                allowed = roles;
                break;
            case "BRANCHMANAGER":
                allowed = ["HR", "SALES MANAGER", "TL", "BA", "SBA"];
                break;
            case "HR":
            case "SALESMANAGER":
                allowed = ["TL", "BA", "SBA"];
                break;
            case "TL":
                allowed = ["BA", "SBA"];
                break;
            default:
                allowed = [];
        }
        setFilteredRoles(roles.filter((r) => allowed.includes(r)));
    }, [roles, currentRoleKey, currentUser]);

    // Load Sales Managers when needed
    useEffect(() => {
        const r = formData.role;
        const b = formData.branch_id;
        if ((r === "TL" || r === "BA" || r === "SBA") && b) {
            axiosInstance
                .get(
                    `/users/?role=SALES MANAGER&active_only=true&branch_id=${encodeURIComponent(
                        b
                    )}`
                )
                .then((r) => setSalesManagers(r.data.data || []))
                .catch(() => toast.error("Failed to load Sales Managers"));
        }
    }, [formData.role, formData.branch_id]);

    // Load Team Leads when needed
    useEffect(() => {
        const r = formData.role;
        const b = formData.branch_id;
        const sm = formData.sales_manager_id;
        if ((r === "BA" || r === "SBA") && b) {
            let url = `/users/?role=TL&active_only=true&branch_id=${encodeURIComponent(
                b
            )}`;
            if (sm) url += `&sales_manager_id=${encodeURIComponent(sm)}`;
            axiosInstance
                .get(url)
                .then((r) => setTeamLeads(r.data.data || []))
                .catch(() => toast.error("Failed to load Team Leads"));
        }
    }, [formData.role, formData.branch_id, formData.sales_manager_id]);

    // ---- actions --------------------------------------------------------------

    const handleVerifyPan = async () => {
        if (!formData.pan) return toast.error("Enter a PAN first");
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
                toast.error("PAN failed");
            }
        } catch {
            toast.dismiss();
            toast.error("Error verifying PAN");
        } finally {
            setLoadingPan(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- Required field checks ---
        if (!formData.name.trim()) return toast.error("Full Name is required");
        if (!formData.email.trim()) return toast.error("Email is required");
        if (!formData.phone_number.trim()) return toast.error("Phone number is required");
        if (!formData.role) return toast.error("Role selection is required");
        if (!formData.branch_id && currentRoleKey === "SUPERADMIN")
            return toast.error("Branch selection is required");

        // PAN checks
        if (!formData.pan.trim()) return toast.error("PAN is required");
        if (formData.pan.trim().length !== 10) return toast.error("PAN must be 10 characters");
        if (!PAN_REGEX.test(formData.pan.trim()))
            return toast.error("Enter a valid PAN (e.g., ABCDE1234F)");

        // Aadhaar validation
        if (formData.aadhaar && !isValidAadhaar(formData.aadhaar))
            return toast.error("Aadhaar must be 12 digits or masked like XXXXXXXX1234");

        // Phone validation
        if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number))
            return toast.error("Phone must be 10 digits");

        // Password validation
        if (!isEdit && !passwordRegex.test(formData.password)) {
            return toast.error("Password must be ≥6 chars, include a number & special char");
        }
        if (isEdit && formData.password && !passwordRegex.test(formData.password)) {
            return toast.error("Password must be ≥6 chars, include a number & special char");
        }

        // Role specific validations
        if (formData.role === "TL" && !formData.sales_manager_id)
            return toast.error("Sales Manager is required for TL");
        if ((formData.role === "BA" || formData.role === "SBA") && !formData.tl_id)
            return toast.error("Team Lead is required for BA/SBA");

        // --- Submit logic ---
        setIsSubmitting(true);
        toast.loading(isEdit ? "Updating…" : "Adding user…");
        try {
            const { password: _pwd, ...rest } = formData;

            const payload = {
                ...rest,
                branch_id:
                    Number(
                        currentRoleKey === "SUPERADMIN"
                            ? formData.branch_id
                            : formData.branch_id || currentUser?.branch_id
                    ) || undefined,
                experience: Number(formData.experience) || 0,
                // send undefined (omit) rather than "" to avoid Pydantic "too short" date errors
                date_of_joining: toISOorUndefined(formData.date_of_joining),
                date_of_birth: toISOorUndefined(formData.date_of_birth),
            };

            // strip empty strings so backend doesn't see ""
            Object.keys(payload).forEach((k) => {
                if (payload[k] === "") delete payload[k];
            });

            let res;
            if (isEdit) {
                if (formData.password) payload.password = formData.password;
                res = await axiosInstance.put(`/users/${user.employee_code}`, payload);
            } else {
                res = await axiosInstance.post("/users/", {
                    ...payload,
                    password: formData.password,
                    is_active: true,
                });
            }

            toast.dismiss();
            toast.success(isEdit ? "Updated!" : "Added!");
            onSuccess(res.data);
            setCreatedUser(res.data);
            setShowPermissionsModal(true);
            onClose();
        } catch (err) {
            toast.dismiss();
            // 👇 show field-wise server messages (like your screenshot)
            showApiErrors(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    // ---- render ---------------------------------------------------------------

    if (!isOpen) return null;

    const aadhaarError =
        formData.aadhaar.length > 0 && !isValidAadhaar(formData.aadhaar)
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
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
                    <div className="p-4 sm:p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Basic Information</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        disabled={isPanVerified}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                    {phoneError && <div className="mb-1 text-xs text-red-600 font-medium">{phoneError}</div>}
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        maxLength={10}
                                        value={formData.phone_number}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, "");
                                            setFormData({ ...formData, phone_number: digits.slice(0, 10) });
                                        }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        value={formData.father_name}
                                        onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                                        disabled={isPanVerified}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {isEdit ? "Reset Password" : "Password *"}
                                    </label>
                                    {isEdit && (
                                        <p className="text-xs text-gray-500 mb-1">Leave blank to keep existing password.</p>
                                    )}
                                    {passwordError && (
                                        <div id="pwd-error" className="mb-1 text-xs text-red-600 font-medium">
                                            {passwordError}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <input
                                            className="w-full p-3 border rounded-xl pr-10 bg-white text-gray-900 placeholder-gray-400 caret-gray-700"
                                            type={showPwd ? "text" : "password"}
                                            value={formData.password ?? ""}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            autoComplete="new-password"
                                            required={!isEdit}
                                            placeholder={isEdit ? "Enter new password" : "Create a password"}
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

                            {/* Column 2 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Document & Role</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            className="flex-1 p-3 border rounded-xl"
                                            value={formData.pan}
                                            onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                                    {aadhaarError && <div className="mb-1 text-xs text-red-600 font-medium">{aadhaarError}</div>}
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        maxLength={12}
                                        value={formData.aadhaar}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/[^0-9xX]/g, "").toUpperCase().slice(0, 12);
                                            setFormData({ ...formData, aadhaar: clean });
                                        }}
                                        disabled={isPanVerified}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                    <select
                                        className="w-full p-3 border rounded-xl bg-white"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Role</option>
                                        {(filteredRoles.length ? filteredRoles : roles).map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Branch: SUPERADMIN = dropdown, others = read-only label (no dropdown) */}
                                {formData.role !== "RESEARCHER" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>

                                        {currentRoleKey === "SUPERADMIN" ? (
                                            // SUPERADMIN: normal dropdown
                                            <select
                                                className="w-full p-3 border rounded-xl bg-white"
                                                value={formData.branch_id}
                                                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Branch</option>
                                                {branches.map((b) => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            // Others: read-only branch name, never show dropdown
                                            (() => {
                                                const eff = getEffectiveBranchId({
                                                    currentUser, user, isEdit, formBranchId: formData.branch_id,
                                                });
                                                const label = eff ? getBranchName(branches, eff) : "Loading branch…";
                                                return (
                                                    <>
                                                        <div className="w-full p-3 border rounded-xl bg-gray-50 text-gray-700 select-none">
                                                            {label}
                                                        </div>
                                                        {/* submit actual value silently */}
                                                        {eff && <input type="hidden" name="branch_id" value={eff} />}
                                                    </>
                                                );
                                            })()
                                        )}
                                    </div>
                                )}



                                {(formData.role === "TL" || formData.role === "BA" || formData.role === "SBA") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sales Manager *</label>
                                        <select
                                            className="w-full p-3 border rounded-xl bg-white"
                                            value={formData.sales_manager_id}
                                            onChange={(e) => setFormData({ ...formData, sales_manager_id: e.target.value })}
                                            required={formData.role === "TL"}
                                        >
                                            <option value="">Select Sales Manager</option>
                                            {salesManagers.map((sm) => (
                                                <option key={sm.employee_code} value={sm.employee_code}>
                                                    {sm.name} ({sm.employee_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(formData.role === "BA" || formData.role === "SBA") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Team Lead *</label>
                                        <select
                                            className="w-full p-3 border rounded-xl bg-white"
                                            value={formData.tl_id}
                                            onChange={(e) => setFormData({ ...formData, tl_id: e.target.value })}
                                            required
                                            disabled={!formData.sales_manager_id}
                                        >
                                            <option value="">Select Team Lead</option>
                                            {teamLeads.map((tl) => (
                                                <option key={tl.employee_code} value={tl.employee_code}>
                                                    {tl.name} ({tl.employee_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Address Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Address Info</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input className="p-3 border rounded-xl w-full" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input className="p-3 border rounded-xl w-full" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                    <input className="p-3 border rounded-xl w-full" value={formData.pincode} onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, ""); // keep only numbers
                                        setFormData({ ...formData, pincode: digits });
                                    }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
                                <textarea className="w-full p-3 border rounded-xl resize-none" rows="3" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900">Additional Info</h4>

                            {/* Dates row (compact, aligned) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                {/* DOJ */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date of Joining (DD-MM-YYYY)
                                    </label>
                                    <DatePicker
                                        selected={dmyToDate(formData.date_of_joining)}
                                        onChange={(date) =>
                                            setFormData((p) => ({ ...p, date_of_joining: dateToDMY(date) }))
                                        }
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="DD-MM-YYYY"
                                        className={INPUT_CLS}
                                        isClearable
                                        showPopperArrow={false}
                                    />
                                </div>

                                {/* DOB — locked after PAN verification */}
                                <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth (DD-MM-YYYY)
                                        </label>
                                    <DatePicker
                                        selected={dmyToDate(formData.date_of_birth)}
                                        onChange={(date) =>
                                            setFormData((p) => ({ ...p, date_of_birth: dateToDMY(date) }))
                                        }
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="DD-MM-YYYY"
                                        className={`${INPUT_CLS} ${isPanVerified ? "opacity-80 pointer-events-none bg-gray-50" : ""}`}
                                        isClearable
                                        showPopperArrow={false}
                                        disabled={isPanVerified}     // <- disables DOB after PAN fetch
                                        title={isPanVerified ? "DOB is locked after PAN verification" : undefined}
                                    />
                                </div>
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                                <input
                                    className={INPUT_CLS}
                                    type="number"
                                    value={formData.experience}
                                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                />
                            </div>

                            {/* Comments */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-xl resize-none"
                                    rows="3"
                                    value={formData.comment}
                                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                />
                            </div>
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
                                    <Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? "Updating" : "Saving"}…
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

            {/* Permissions */}
            {showPermissionsModal && createdUser && (
                <UserPermissionsModal
                    isOpen={showPermissionsModal}
                    onClose={() => setShowPermissionsModal(false)}
                    user={createdUser}
                />
            )}
        </div>
    );
}
