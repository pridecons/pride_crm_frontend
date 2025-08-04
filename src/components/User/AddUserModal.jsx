"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, CreditCard, MapPin, Calendar, Loader2, Check } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import UserPermissionsModal from "./UserPermissionsModal";
import toast from "react-hot-toast";

export default function AddUserModal({
    isOpen,
    onClose,
    branches,
    roles,
    onUserAdded,
    currentUser,       // ✅ Logged-in user info
    selectedBranchId,  // ✅ Branch selected from main page
}) {
    const [newUser, setNewUser] = useState({
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanVerified, setIsPanVerified] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [createdUser, setCreatedUser] = useState(null);
    const [filteredRoles, setFilteredRoles] = useState([]);
    const [salesManagers, setSalesManagers] = useState([]);
    const [teamLeads, setTeamLeads] = useState([]);

    useEffect(() => {
        if ((newUser.role === "TL" || newUser.role === "BA" || newUser.role === "SBA") && newUser.branch_id) {
            axiosInstance
                .get(`/users/?role=SALES MANAGER&active_only=true&branch_id=${newUser.branch_id}`)
                .then((res) => setSalesManagers(res.data?.data || []))
                .catch(() => toast.error("Failed to load Sales Managers"));
        }
    }, [newUser.role, newUser.branch_id]);

    useEffect(() => {
        if ((newUser.role === "BA" || newUser.role === "SBA") && newUser.branch_id) {
            let url = `/users/?role=TL&active_only=true&branch_id=${newUser.branch_id}`;
            if (newUser.sales_manager_id) {
                url += `&sales_manager_id=${newUser.sales_manager_id}`;
            }
            axiosInstance
                .get(url)
                .then((res) => setTeamLeads(res.data?.data || []))
                .catch(() => toast.error("Failed to load Team Leads"));
        }
    }, [newUser.role, newUser.branch_id, newUser.sales_manager_id]);

    useEffect(() => {
        if (!roles.length || !currentUser) return;
        let allowedRoles = [];

        switch (currentUser.role) {
            case "SUPERADMIN":
                allowedRoles = roles;
                break;
            case "BRANCH MANAGER":
                allowedRoles = ["HR", "SALES MANAGER", "TL", "BA", "SBA"];
                break;
            case "HR":
                allowedRoles = ["TL", "BA", "SBA"];
                break;
            case "SALES MANAGER":
                allowedRoles = ["TL", "BA", "SBA"];
                break;
            case "TL":
                allowedRoles = ["BA", "SBA"];
                break;
            default:
                allowedRoles = [];
        }

        setFilteredRoles(roles.filter((r) => allowedRoles.includes(r)));
    }, [roles, currentUser]);

    const formatToISO = (ddmmyyyy) => {
        if (!ddmmyyyy) return "";
        const [dd, mm, yyyy] = ddmmyyyy.split("-");
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleDateChange = (field, value) => {
        if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
            setNewUser((prev) => ({ ...prev, [field]: value }));
        }
    };

    const handleVerifyPan = async () => {
        if (!newUser.pan) {
            toast.error("Please enter a PAN number first");
            return;
        }
        setLoadingPan(true);
        toast.loading("Verifying PAN...");
        try {
            const res = await axiosInstance.post(
                "/micro-pan-verification",
                new URLSearchParams({ pannumber: newUser.pan }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
            toast.dismiss();

            if (res.data.success && res.data.data?.result) {
                const result = res.data.data.result;
                setNewUser((prev) => ({
                    ...prev,
                    name: result.user_full_name || prev.name,
                    father_name: result.user_father_name || prev.father_name,
                    date_of_birth: result.user_dob || prev.date_of_birth,
                    address: result.user_address?.full || prev.address,
                    city: result.user_address?.city || prev.city,
                    state: result.user_address?.state || prev.state,
                }));
                setIsPanVerified(true);
                toast.success("PAN verified and details autofilled!");
            } else {
                toast.error("PAN verification failed");
            }
        } catch (err) {
            toast.dismiss();
            console.error(err);
            toast.error("Error verifying PAN");
        } finally {
            setLoadingPan(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Field validations
        if (!/^\d{12}$/.test(newUser.aadhaar)) {
            toast.error("Aadhaar must be exactly 12 digits.");
            return;
        }
        if (!/^\d{10}$/.test(newUser.phone_number)) {
            toast.error("Phone number must be exactly 10 digits.");
            return;
        }
        if (!passwordRegex.test(newUser.password)) {
            toast.error("Password must be at least 6 chars and contain a number & special character.");
            return;
        }
        if (newUser.role === "TL" && !newUser.sales_manager_id) {
            toast.error("Sales Manager is required for TL role");
            return;
        }
        if ((newUser.role === "BA" || newUser.role === "SBA") && !newUser.tl_id) {
            toast.error("Team Lead is required for BA/SBA role");
            return;
        }

        setIsSubmitting(true);
        try {
            toast.loading("Adding user...");
            const { data } = await axiosInstance.post("/users/", {
                ...newUser,
                branch_id: newUser.branch_id ? Number(newUser.branch_id) : null,
                experience: Number(newUser.experience) || 0,
                date_of_joining: formatToISO(newUser.date_of_joining),
                date_of_birth: formatToISO(newUser.date_of_birth),
                is_active: true,
            });

            toast.dismiss(); // dismiss loading
            toast.success("User added successfully!");
            onUserAdded(data);
            onClose();

            setNewUser({
                name: "", email: "", phone_number: "", father_name: "", password: "", pan: "", aadhaar: "", address: "", city: "", state: "", pincode: "", comment: "", experience: "", date_of_joining: "", date_of_birth: "", role: "", branch_id: "", sales_manager_id: "", tl_id: "",
            });
        } catch (err) {
            toast.dismiss();
            console.error(err);
            toast.error("Failed to add user");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{6,}$/;
    // at least one number, one special char, min 6 chars

    // Place inside your component, above return
    const aadhaarError = newUser.aadhaar.length > 0 && newUser.aadhaar.length !== 12
        ? "Aadhaar number must be exactly 12 digits"
        : "";

    const phoneError = newUser.phone_number.length > 0 && newUser.phone_number.length !== 10
        ? "Phone number must be exactly 10 digits"
        : "";

    const passwordError =
        newUser.password.length > 0 && !passwordRegex.test(newUser.password)
            ? "Password must be at least 6 characters, include a number and a special character."
            : "";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white z-10 flex justify-end px-4 pt-4 border-b">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="w-full">
                    <div className="p-4 sm:p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Basic Information</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input className="w-full p-3 border rounded-xl" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input className="w-full p-3 border rounded-xl" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                    {phoneError && (
                                        <div className="mb-1 text-xs text-red-600 font-medium">{phoneError}</div>
                                    )}
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        maxLength={10}
                                        value={newUser.phone_number}
                                        onChange={e => {
                                            const digits = e.target.value.replace(/\D/g, "");
                                            setNewUser({ ...newUser, phone_number: digits.slice(0, 10) });
                                        }}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                                    <input className="w-full p-3 border rounded-xl" value={newUser.father_name} onChange={(e) => setNewUser({ ...newUser, father_name: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    {passwordError && (
                                        <div className="mb-1 text-xs text-red-600 font-medium">{passwordError}</div>
                                    )}
                                    <input className="w-full p-3 border rounded-xl" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Document & Role</h4>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 p-3 border rounded-xl" value={newUser.pan} onChange={(e) => setNewUser({ ...newUser, pan: e.target.value.toUpperCase() })} />
                                        <button
                                            type="button"
                                            onClick={handleVerifyPan}
                                            disabled={loadingPan || isPanVerified}
                                            className={`px-4 py-3 rounded-xl flex items-center gap-2 ${isPanVerified ? "bg-green-600 text-white cursor-default" : "bg-blue-600 hover:bg-blue-700 text-white"
                                                }`}
                                        >
                                            {loadingPan ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : isPanVerified ? <><Check className="w-4 h-4" /> Verified</> : <><Check className="w-4 h-4" /> Verify</>}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                                    {aadhaarError && (
                                        <div className="mb-1 text-xs text-red-600 font-medium">{aadhaarError}</div>
                                    )}
                                    <input
                                        className="w-full p-3 border rounded-xl"
                                        maxLength={12}
                                        value={newUser.aadhaar}
                                        onChange={e => {
                                            const digits = e.target.value.replace(/\D/g, "");
                                            setNewUser({ ...newUser, aadhaar: digits.slice(0, 12) });
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                    <select className="w-full p-3 border rounded-xl bg-white" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} required>
                                        <option value="">Select Role</option>
                                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {newUser.role !== "RESEARCHER" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                                        <select
                                            className="w-full p-3 border rounded-xl bg-white"
                                            value={newUser.branch_id}
                                            onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Branch</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {(newUser.role === "TL" || newUser.role === "BA" || newUser.role === "SBA") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sales Manager *</label>
                                        <select className="w-full p-3 border rounded-xl bg-white" value={newUser.sales_manager_id} onChange={(e) => setNewUser({ ...newUser, sales_manager_id: e.target.value })} required={newUser.role === "TL"}>
                                            <option value="">Select Sales Manager</option>
                                            {salesManagers.map((sm) => <option key={sm.employee_code} value={sm.employee_code}>{sm.name} ({sm.employee_code})</option>)}
                                        </select>
                                    </div>
                                )}

                                {(newUser.role === "BA" || newUser.role === "SBA") && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Team Lead *</label>
                                        <select className="w-full p-3 border rounded-xl bg-white" value={newUser.tl_id} onChange={(e) => setNewUser({ ...newUser, tl_id: e.target.value })} required disabled={!newUser.sales_manager_id}>
                                            <option value="">Select Team Lead</option>
                                            {teamLeads.map((tl) => <option key={tl.employee_code} value={tl.employee_code}>{tl.name} ({tl.employee_code})</option>)}
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
                                    <input className="p-3 border rounded-xl w-full" value={newUser.city} onChange={(e) => setNewUser({ ...newUser, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input className="p-3 border rounded-xl w-full" value={newUser.state} onChange={(e) => setNewUser({ ...newUser, state: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                    <input className="p-3 border rounded-xl w-full" value={newUser.pincode} onChange={(e) => setNewUser({ ...newUser, pincode: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address</label>
                                <textarea className="w-full p-3 border rounded-xl resize-none" rows="3" value={newUser.address} onChange={(e) => setNewUser({ ...newUser, address: e.target.value })} />
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Additional Info</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining (DD-MM-YYYY)</label>
                                    <input className="p-3 border rounded-xl w-full" value={newUser.date_of_joining} onChange={(e) => handleDateChange("date_of_joining", e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (DD-MM-YYYY)</label>
                                    <input className="p-3 border rounded-xl w-full" value={newUser.date_of_birth} onChange={(e) => handleDateChange("date_of_birth", e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                                <input className="p-3 border rounded-xl w-full" type="number" value={newUser.experience} onChange={(e) => setNewUser({ ...newUser, experience: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                                <textarea className="w-full p-3 border rounded-xl resize-none" rows="3" value={newUser.comment} onChange={(e) => setNewUser({ ...newUser, comment: e.target.value })} />
                            </div>
                        </div>
                        {/* ...rest of your fields... */}
                        <div className="flex justify-end gap-3 pt-6">
                            <button
                                type="button"
                                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
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
