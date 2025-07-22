"use client";

import { useEffect, useState } from "react";
import { X, UserPlus, CreditCard, MapPin, Calendar, Loader2, Check } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-toastify";
import UserPermissionsModal from "./UserPermissionsModal";

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
        try {
            const res = await axiosInstance.post(
                "/micro-pan-verification",
                new URLSearchParams({ pannumber: newUser.pan }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

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
                setIsPanVerified(true); // ✅ Mark PAN as verified
                toast.success("PAN verified and details autofilled!");
            } else {
                toast.error("PAN verification failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error verifying PAN");
        } finally {
            setLoadingPan(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ Validation before anything
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
            const { data } = await axiosInstance.post("/users/", {
                ...newUser,
                branch_id: newUser.branch_id ? Number(newUser.branch_id) : null,
                experience: Number(newUser.experience) || 0,
                date_of_joining: formatToISO(newUser.date_of_joining),
                date_of_birth: formatToISO(newUser.date_of_birth),
                is_active: true,
            });

            toast.success("User added successfully!");
            onUserAdded(data);
            onClose();

            // ✅ Reset form
            setNewUser({
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
        } catch (err) {
            console.error(err);
            toast.error("Failed to add user");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="w-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-full p-2">
                                <UserPlus className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white">Add New User</h3>
                        </div>
                        <button type="button" onClick={onClose} className="text-white hover:text-gray-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Basic Information</h4>
                                <input className="w-full p-3 border rounded-xl" placeholder="Full Name *" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                                <input className="w-full p-3 border rounded-xl" placeholder="Email *" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                                <input className="w-full p-3 border rounded-xl" placeholder="Phone *" value={newUser.phone_number} onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })} required />
                                <input className="w-full p-3 border rounded-xl" placeholder="Father Name" value={newUser.father_name} onChange={(e) => setNewUser({ ...newUser, father_name: e.target.value })} />
                                <input className="w-full p-3 border rounded-xl" type="password" placeholder="Password *" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Document & Role</h4>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 p-3 border rounded-xl"
                                        placeholder="PAN Number"
                                        value={newUser.pan}
                                        onChange={(e) =>
                                            setNewUser({ ...newUser, pan: e.target.value.toUpperCase() })
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyPan}
                                        disabled={loadingPan || isPanVerified}
                                        className={`px-4 py-3 rounded-xl flex items-center gap-2 ${isPanVerified
                                            ? "bg-green-600 text-white cursor-default"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                            }`}
                                    >
                                        {loadingPan ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                                            </>
                                        ) : isPanVerified ? (
                                            <>
                                                <Check className="w-4 h-4" /> Verified
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" /> Verify
                                            </>
                                        )}
                                    </button>
                                </div>
                                <input
                                    className="w-full p-3 border rounded-xl"
                                    placeholder="Aadhaar Number"
                                    value={newUser.aadhaar}
                                    maxLength={12}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
                                        setNewUser({ ...newUser, aadhaar: value });
                                    }}
                                />
                                <select className="w-full p-3 border rounded-xl bg-white" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} required>
                                    <option value="">Select Role</option>
                                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <select className="w-full p-3 border rounded-xl bg-white" value={newUser.branch_id} onChange={(e) => setNewUser({ ...newUser, branch_id: e.target.value })}>
                                    <option value="">Select Branch</option>
                                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                {/* Sales Manager Dropdown */}
                                {(newUser.role === "TL" || newUser.role === "BA" || newUser.role === "SBA") && (
                                    <div>
                                        <label className="text-gray-700 text-sm">Select Sales Manager *</label>
                                        <select
                                            className="w-full p-3 border rounded-xl bg-white"
                                            value={newUser.sales_manager_id}
                                            onChange={(e) => setNewUser({ ...newUser, sales_manager_id: e.target.value })}
                                            required={newUser.role === "TL"}
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

                                {/* Team Lead Dropdown */}
                                {(newUser.role === "BA" || newUser.role === "SBA") && (
                                    <div>
                                        <label className="text-gray-700 text-sm">Select Team Lead *</label>
                                        <select
                                            className="w-full p-3 border rounded-xl bg-white"
                                            value={newUser.tl_id}
                                            onChange={(e) => setNewUser({ ...newUser, tl_id: e.target.value })}
                                            required
                                            disabled={!newUser.sales_manager_id}
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

                        {/* Address */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Address Info</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input className="p-3 border rounded-xl" placeholder="City" value={newUser.city} onChange={(e) => setNewUser({ ...newUser, city: e.target.value })} />
                                <input className="p-3 border rounded-xl" placeholder="State" value={newUser.state} onChange={(e) => setNewUser({ ...newUser, state: e.target.value })} />
                                <input className="p-3 border rounded-xl" placeholder="Pincode" value={newUser.pincode} onChange={(e) => setNewUser({ ...newUser, pincode: e.target.value })} />
                            </div>
                            <textarea className="w-full p-3 border rounded-xl resize-none" placeholder="Complete Address" rows="3" value={newUser.address} onChange={(e) => setNewUser({ ...newUser, address: e.target.value })} />
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900">Additional Info</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input className="p-3 border rounded-xl" placeholder="Date of Joining (DD-MM-YYYY)" value={newUser.date_of_joining} onChange={(e) => handleDateChange("date_of_joining", e.target.value)} />
                                <input className="p-3 border rounded-xl" placeholder="Date of Birth (DD-MM-YYYY)" value={newUser.date_of_birth} onChange={(e) => handleDateChange("date_of_birth", e.target.value)} />
                            </div>
                            <input className="p-3 border rounded-xl" type="number" placeholder="Experience (Years)" value={newUser.experience} onChange={(e) => setNewUser({ ...newUser, experience: e.target.value })} />
                            <textarea className="w-full p-3 border rounded-xl resize-none" placeholder="Comments" rows="3" value={newUser.comment} onChange={(e) => setNewUser({ ...newUser, comment: e.target.value })} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-white border rounded-xl hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2">
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><UserPlus className="w-4 h-4" /> Add User</>}
                        </button>
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
